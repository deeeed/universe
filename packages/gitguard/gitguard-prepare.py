#!/usr/bin/env python3

import sys
import os
from pathlib import Path
from subprocess import check_output, run
import json
from typing import Dict, List, Optional, Set
from datetime import datetime

# Try to import optional dependencies
try:
    from azure.identity import DefaultAzureCredential
    from openai import AzureOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

class Config:
    """Configuration handler with global and local settings."""
    
    DEFAULT_CONFIG = {
        "auto_mode": False,
        "use_ai": False,
        "azure_endpoint": "https://consensys-ai.openai.azure.com/",
        "azure_deployment": "gpt-4o",
        "azure_api_version": "2024-02-15-preview",
        "debug": False,
    }

    def __init__(self):
        self._config = self.DEFAULT_CONFIG.copy()
        self._load_configurations()

    def _load_json_file(self, path: Path) -> Dict:
        try:
            if path.exists():
                return json.loads(path.read_text())
        except Exception as e:
            if self._config.get('debug'):
                print(f"⚠️  Error loading config from {path}: {e}")
        return {}

    def _load_configurations(self):
        # 1. Global configuration
        global_config = self._load_json_file(Path.home() / '.gitguard' / 'config.json')
        self._config.update(global_config)

        # 2. Local configuration
        try:
            git_root = Path(check_output(['git', 'rev-parse', '--show-toplevel'],
                                       text=True).strip())
            local_config = self._load_json_file(git_root / '.gitguard' / 'config.json')
            self._config.update(local_config)
        except Exception:
            pass

        # 3. Environment variables
        env_mappings = {
            'GITGUARD_AUTO': ('auto_mode', lambda x: x.lower() in ('1', 'true', 'yes')),
            'GITGUARD_USE_AI': ('use_ai', lambda x: x.lower() in ('1', 'true', 'yes')),
            'AZURE_OPENAI_ENDPOINT': ('azure_endpoint', str),
            'AZURE_OPENAI_DEPLOYMENT': ('azure_deployment', str),
            'AZURE_OPENAI_API_VERSION': ('azure_api_version', str),
            'GITGUARD_DEBUG': ('debug', lambda x: x.lower() in ('1', 'true', 'yes'))
        }

        for env_var, (config_key, transform) in env_mappings.items():
            if (value := os.environ.get(env_var)) is not None:
                self._config[config_key] = transform(value)

        if self._config.get('debug'):
            print("\n🔧 Active configuration:", json.dumps(self._config, indent=2))

    def get(self, key: str, default=None):
        return self._config.get(key, default)

def detect_change_types(files: List[str]) -> Set[str]:
    """Detect change types based on files modified."""
    types = set()
    
    for file in files:
        file_lower = file.lower()
        name = Path(file).name.lower()
        
        if any(pattern in file_lower for pattern in ['.test.', '.spec.', '/tests/']):
            types.add('test')
        elif any(pattern in file_lower for pattern in ['.md', 'readme', 'docs/']):
            types.add('docs')
        elif any(pattern in file_lower for pattern in ['.css', '.scss', '.styled.']):
            types.add('style')
        elif any(pattern in name for pattern in ['package.json', '.config.', 'tsconfig']):
            types.add('chore')
        elif any(word in file_lower for word in ['fix', 'bug', 'patch']):
            types.add('fix')
    
    if not types:
        types.add('feat')
        
    return types

def get_package_json_name(package_path: Path) -> Optional[str]:
    """Get package name from package.json if it exists."""
    try:
        pkg_json_path = Path.cwd() / package_path / 'package.json'
        if pkg_json_path.exists():
            return json.loads(pkg_json_path.read_text()).get('name')
    except:
        return None
    return None

def get_changed_packages() -> List[Dict]:
    """Get all packages with changes in the current commit."""
    changed_files = check_output(['git', 'diff', '--cached', '--name-only'])
    changed_files = changed_files.decode('utf-8').strip().split('\n')
    
    packages = {}
    for file in changed_files:
        if not file:
            continue
            
        if file.startswith('packages/'):
            parts = file.split('/')
            if len(parts) > 1:
                pkg_path = f"packages/{parts[1]}"
                if pkg_path not in packages:
                    packages[pkg_path] = []
                packages[pkg_path].append(file)
        else:
            if 'root' not in packages:
                packages['root'] = []
            packages['root'].append(file)
    
    results = []
    for pkg_path, files in packages.items():
        if pkg_path == 'root':
            scope = name = 'root'
        else:
            pkg_name = get_package_json_name(Path(pkg_path))
            if pkg_name:
                name = pkg_name
                scope = pkg_name.split('/')[-1]
            else:
                name = scope = pkg_path.split('/')[-1]
        
        results.append({
            'name': name,
            'scope': scope,
            'files': files,
            'types': detect_change_types(files)
        })
    
    return results

def format_commit_message(original_msg: str, package: Dict, commit_type: Optional[str] = None) -> str:
    """Format commit message for a single package."""
    if ':' in original_msg:
        type_part, msg = original_msg.split(':', 1)
        msg = msg.strip()
        if '(' in type_part and ')' in type_part:
            commit_type = type_part.split('(')[0]
        else:
            commit_type = type_part
    else:
        msg = original_msg
        if not commit_type:
            commit_type = next(iter(package['types']))

    return f"{commit_type}({package['scope']}): {msg}"

def generate_ai_prompt(packages: List[Dict], original_msg: str) -> str:
    """Generate a detailed prompt for AI assistance."""
    try:
        diff = check_output(['git', 'diff', '--cached']).decode('utf-8')
    except:
        diff = "Failed to get diff"

    prompt = f"""Please suggest a git commit message following conventional commits format.

Original message: "{original_msg}"

Changed packages:
{'-' * 40}"""

    for pkg in packages:
        prompt += f"""

📦 Package: {pkg['name']}
Detected change types: {', '.join(pkg['types'])}
Files changed:
{chr(10).join(f'- {file}' for file in pkg['files'])}"""

    prompt += f"""
{'-' * 40}

Git diff:
```diff
{diff}
```

Please provide a single commit message that:
1. Follows the format: type(scope): description
2. Uses the most significant package as scope
3. Lists other affected packages if any
4. Includes brief bullet points for significant changes

Use one of: feat|fix|docs|style|refactor|perf|test|chore
Keep the description clear and concise"""

    return prompt

def prompt_user(question: str) -> bool:
    """Prompt user for yes/no question using /dev/tty."""
    try:
        with open('/dev/tty', 'r') as tty:
            print(f"{question} [Y/n]", end=' ', flush=True)
            response = tty.readline().strip().lower()
            return response == '' or response != 'n'
    except Exception:
        return True

def get_ai_suggestion(prompt: str) -> Optional[List[Dict[str, str]]]:
    """Get structured commit message suggestions from Azure OpenAI."""
    if not HAS_OPENAI:
        return None

    config = Config()
    try:
        client = AzureOpenAI(
            api_key=config.get('azure_api_key') or os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=config.get('azure_api_version'),
            azure_endpoint=config.get('azure_endpoint')
        )

        system_prompt = """You are a helpful git commit message assistant. 
        Provide 3 different conventional commit messages that are clear and concise.
        Return your response in the following JSON format:
        {
            "suggestions": [
                {
                    "message": "type(scope): description",
                    "explanation": "Brief explanation of why this format was chosen",
                    "type": "commit type used",
                    "scope": "scope used",
                    "description": "main message"
                }
            ]
        }"""

        response = client.chat.completions.create(
            model=config.get('azure_deployment'),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={ "type": "json_object" }
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get('suggestions', [])
        
    except Exception as e:
        print(f"\n⚠️  AI suggestion failed: {e}")
        return None

def display_suggestions(suggestions: List[Dict[str, str]]) -> Optional[str]:
    """Display suggestions and get user choice."""
    print("\n✨ AI Suggestions:")
    
    for i, suggestion in enumerate(suggestions, 1):
        print(f"\n{i}. {'=' * 48}")
        print(f"Message: {suggestion['message']}")
        print(f"Type: {suggestion['type']}")
        print(f"Scope: {suggestion['scope']}")
        print(f"Explanation: {suggestion['explanation']}")
        print('=' * 50)
    
    while True:
        choice = input('\nChoose suggestion (1-3) or press Enter to skip: ').strip()
        if not choice:
            return None
        if choice in ('1', '2', '3'):
            return suggestions[int(choice) - 1]['message']
        print("Please enter 1, 2, 3 or press Enter to skip")

def main():
    try:
        config = Config()
        
        commit_msg_file = sys.argv[1]
        with open(commit_msg_file, 'r') as f:
            original_msg = f.read().strip()

        if original_msg.startswith('Merge'):
            sys.exit(0)

        packages = get_changed_packages()
        if not packages:
            sys.exit(0)

        print('\n🔍 Analyzing changes...')
        print('Original message:', original_msg)

        # Handle multiple packages first
        if len(packages) > 1:
            print('\n📦 Changes in multiple packages:')
            for pkg in packages:
                print(f"• {pkg['name']} ({', '.join(pkg['types'])})")
                for file in pkg['files']:
                    print(f"  - {file}")
            print("\n⚠️  Consider splitting this commit for better readability!")

        # AI suggestion flow - only if user wants it
        if prompt_user('\nWould you like AI suggestions?'):
            print("\n🤖 Getting AI suggestions...")
            prompt = generate_ai_prompt(packages, original_msg)
            suggestions = get_ai_suggestion(prompt)
            
            if suggestions:
                chosen_message = display_suggestions(suggestions)
                if chosen_message:
                    with open(commit_msg_file, 'w') as f:
                        f.write(chosen_message)
                    print('✅ Commit message updated!\n')
                    return
        
        # Fallback to automatic formatting
        if len(packages) > 1:
            main_pkg = packages[0]
            main_type = next(iter(main_pkg['types']))
            new_msg = format_commit_message(original_msg, main_pkg, main_type)
            new_msg += '\n\nAffected packages:\n' + '\n'.join(f"- {p['name']}" for p in packages)
        else:
            pkg = packages[0]
            main_type = next(iter(pkg['types']))
            new_msg = format_commit_message(original_msg, pkg, main_type)

        print(f'\n✨ Suggested message: {new_msg}')
        
        if prompt_user('\nUse suggested message?'):
            with open(commit_msg_file, 'w') as f:
                f.write(new_msg)
            print('✅ Commit message updated!\n')

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
