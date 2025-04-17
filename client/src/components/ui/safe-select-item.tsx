/**
 * SafeSelectItem Component
 * 
 * A wrapper around SelectItem that prevents empty string values
 * This helps avoid common issues with the SelectItem component
 */
import React from "react";
import { SelectItem } from "@/components/ui/select";
import { validateSelectItemValue } from "@/utils/componentValidator";

interface SafeSelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectItem> {
  /**
   * The value of the select item. Cannot be an empty string.
   */
  value: string;
  
  /**
   * The fallback value to use if value is empty
   */
  fallbackValue?: string;
}

/**
 * A safe wrapper for SelectItem that prevents empty values
 * 
 * @example
 * ```tsx
 * <Select>
 *   <SafeSelectItem value="option1">Option 1</SafeSelectItem>
 *   <SafeSelectItem value="option2">Option 2</SafeSelectItem>
 * </Select>
 * ```
 */
export function SafeSelectItem({
  value,
  fallbackValue = "default",
  children,
  ...props
}: SafeSelectItemProps) {
  // In development mode, validate value and use fallback if needed
  let safeValue = value;
  
  if (process.env.NODE_ENV === 'development' && value === '') {
    console.warn(`SafeSelectItem received an empty value. Using "${fallbackValue}" instead.`);
    safeValue = fallbackValue;
  }
  
  // In production, throw an error for empty values to prevent bugs
  if (process.env.NODE_ENV === 'production' && value === '') {
    throw new Error('SelectItem values cannot be empty strings. Use a non-empty value instead.');
  }
  
  return (
    <SelectItem value={safeValue} {...props}>
      {children}
    </SelectItem>
  );
}

export function SafeSelectItemDemo() {
  return (
    <div className="bg-gray-100 p-4 rounded">
      <h3 className="text-md font-medium mb-2">SafeSelectItem Component Demo</h3>
      <p className="text-sm text-gray-600 mb-4">
        This component prevents empty string values in SelectItem components.
      </p>
      
      <div className="flex gap-4">
        <div>
          <p className="text-sm font-medium mb-1">Safe usage:</p>
          <code className="block text-xs bg-white p-2 rounded">
            {'<SafeSelectItem value="option">Option</SafeSelectItem>'}
          </code>
        </div>
        
        <div>
          <p className="text-sm font-medium mb-1">Unsafe usage (prevented):</p>
          <code className="block text-xs bg-white p-2 rounded">
            {'<SafeSelectItem value="">Empty Value</SafeSelectItem>'}
          </code>
        </div>
      </div>
    </div>
  );
}