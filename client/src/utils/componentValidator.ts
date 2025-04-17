/**
 * Component Validator Utility
 * 
 * This utility provides validation helpers for React components
 * Particularly useful for form components and their values
 */

/**
 * Validates that a SelectItem value is not empty
 * This helps prevent the common error of using empty strings in SelectItem components
 * 
 * @param value The value to check
 * @param fieldName The name of the field for error reporting
 * @throws Error if the value is an empty string
 */
export function validateSelectItemValue(value: string, fieldName: string): void {
  if (value === '') {
    throw new Error(`SelectItem values cannot be empty strings in field "${fieldName}". Use a non-empty value instead.`);
  }
}

/**
 * Validates that an array of SelectItem values contains no empty strings
 * 
 * @param values Array of values to check
 * @param fieldName The name of the field for error reporting
 * @throws Error if any value is an empty string
 */
export function validateSelectItemValues(values: string[], fieldName: string): void {
  for (let i = 0; i < values.length; i++) {
    if (values[i] === '') {
      throw new Error(`SelectItem values cannot be empty strings in field "${fieldName}" at index ${i}. Use a non-empty value instead.`);
    }
  }
}

/**
 * Creates a validator function that can be used in form validation schemas
 * 
 * @param message The error message to show
 * @returns A validation function compatible with zod or react-hook-form
 */
export function createSelectItemValidator(message: string = "Value cannot be empty") {
  return (value: string) => {
    return value !== '' || message;
  };
}

/**
 * Generic value validation for SelectItem components to be used during development
 * 
 * @param props The props object containing the value property
 * @param defaultValue A default value to use if the value is empty
 * @returns The validated value or the default value
 */
export function safeSelectItemValue<T extends { value: string }>(
  props: T, 
  defaultValue: string = "default"
): T {
  // Only perform this check in development mode
  if (process.env.NODE_ENV === 'development') {
    if (props.value === '') {
      console.warn(`SelectItem received an empty string value. Using "${defaultValue}" instead.`);
      return { ...props, value: defaultValue };
    }
  }
  
  return props;
}