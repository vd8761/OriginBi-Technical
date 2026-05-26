import React from "react";

interface NumericalEditorProps {
  value: string;
  onChange: (value: string) => void;
  inputCls: string;
}

export const NumericalEditor: React.FC<NumericalEditorProps> = ({
  value,
  onChange,
  inputCls
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/\s/g, ""))}
        className={inputCls}
        placeholder="Enter correct numerical value..."
      />
      <p className="mt-2 text-[10px] text-[#17201b] dark:text-white font-bold italic">
        * Student must type this exact value to score points. Space is not allowed. Case-insensitive.
      </p>
    </div>
  );
};
