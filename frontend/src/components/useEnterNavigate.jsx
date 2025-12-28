import { useRef } from "react";

/**
 * fieldsCount = number of inputs
 * onSubmit = callback to execute when ENTER pressed on last field
 */
export function useEnterNavigate(fieldsCount, onSubmit) {
  const refs = Array.from({ length: fieldsCount }, () => useRef(null));

  const handleKeyDown = (index) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const isLast = index === fieldsCount - 1;

      if (isLast) {
        onSubmit(e);
      } else {
        refs[index + 1].current?.focus();
      }
    }
  };

  return { refs, handleKeyDown };
}
