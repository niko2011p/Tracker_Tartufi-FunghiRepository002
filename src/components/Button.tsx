import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-[#8eaa36] text-white hover:bg-[#7d9830] focus:ring-[#8eaa36]',
    secondary: 'bg-[#fd9a3c] text-white hover:bg-[#e88a2c] focus:ring-[#fd9a3c]',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    outline: 'border-2 border-gray-300 text-gray-700 hover:border-[#fd9a3c] hover:bg-[#fd9a3c]/10 focus:ring-[#fd9a3c]'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Caricamento...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button; 