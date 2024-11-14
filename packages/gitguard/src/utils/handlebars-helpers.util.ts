import type Handlebars from "handlebars";

interface RegisterHelpersParams {
  handlebars: typeof Handlebars;
}

export function registerHandlebarsHelpers(params: RegisterHelpersParams): void {
  const { handlebars } = params;

  // Existing helpers
  handlebars.registerHelper("json", function (context: unknown): string {
    return JSON.stringify(context, null, 2);
  });

  handlebars.registerHelper(
    "includes",
    function (arr: unknown[], value: unknown): boolean {
      return Array.isArray(arr) && arr.includes(value);
    },
  );

  // Comparison helpers
  handlebars.registerHelper("eq", (a: unknown, b: unknown): boolean => a === b);
  handlebars.registerHelper("ne", (a: unknown, b: unknown): boolean => a !== b);
  handlebars.registerHelper("lt", (a: number, b: number): boolean => a < b);
  handlebars.registerHelper("gt", (a: number, b: number): boolean => a > b);
  handlebars.registerHelper("lte", (a: number, b: number): boolean => a <= b);
  handlebars.registerHelper("gte", (a: number, b: number): boolean => a >= b);

  // Array helpers
  handlebars.registerHelper("length", (arr: unknown[]): number =>
    Array.isArray(arr) ? arr.length : 0,
  );
  handlebars.registerHelper("first", (arr: unknown[]): unknown =>
    Array.isArray(arr) && arr.length > 0 ? arr[0] : null,
  );
  handlebars.registerHelper("last", (arr: unknown[]): unknown =>
    Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null,
  );

  // String helpers
  handlebars.registerHelper("lowercase", (str: unknown): unknown =>
    typeof str === "string" ? str.toLowerCase() : str,
  );
  handlebars.registerHelper("uppercase", (str: unknown): unknown =>
    typeof str === "string" ? str.toUpperCase() : str,
  );
  handlebars.registerHelper("capitalize", (str: unknown): unknown =>
    typeof str === "string" ? str.charAt(0).toUpperCase() + str.slice(1) : str,
  );

  // Math helpers
  handlebars.registerHelper("add", (a: number, b: number): number => a + b);
  handlebars.registerHelper(
    "subtract",
    (a: number, b: number): number => a - b,
  );
  handlebars.registerHelper(
    "multiply",
    (a: number, b: number): number => a * b,
  );
  handlebars.registerHelper("divide", (a: number, b: number): number => a / b);

  // Conditional helpers
  handlebars.registerHelper("and", (...args: unknown[]): boolean => {
    args.pop(); // Remove options object
    return args.every(Boolean);
  });
  handlebars.registerHelper("or", (...args: unknown[]): boolean => {
    args.pop(); // Remove options object
    return args.some(Boolean);
  });
  handlebars.registerHelper("not", (value: unknown): boolean => !value);
}
