import React from 'react';

type InputControlProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder: string;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
  rows?: number;
};

const InputControl: React.FC<InputControlProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  options,
  rows = 2,
}) => {
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full bg-gray-100 border-none rounded-md p-2.5 focus:ring-2 focus:ring-brand-teal-500 transition-shadow duration-200 text-sm"
          />
        );
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-gray-100 border-none rounded-md p-2.5 focus:ring-2 focus:ring-brand-teal-500 transition-shadow duration-200 text-sm appearance-none"
          >
            <option value="" disabled>{placeholder}</option>
            {options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-gray-100 border-none rounded-md p-2.5 focus:ring-2 focus:ring-brand-teal-500 transition-shadow duration-200 text-sm"
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="font-medium text-gray-700 text-sm">{label}</label>
      <div className="relative">
        {renderInput()}
      </div>
    </div>
  );
};

export default InputControl;