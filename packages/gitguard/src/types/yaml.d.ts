declare module "*.yml" {
  import { BasePromptTemplate } from "./templates.type";
  const content: BasePromptTemplate;
  export default content;
}
