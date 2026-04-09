import { useRef } from 'react';

interface DialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  type: 'input' | 'confirm';
  onClose: () => void;
  onConfirm: (value?: string) => void;
  confirmText?: string;
  isDanger?: boolean;
}

export default function Dialog({ isOpen, title, placeholder, defaultValue, type, onClose, onConfirm, confirmText, isDanger }: DialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const value = type === 'input' ? inputRef.current?.value ?? defaultValue ?? '' : undefined;
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-gray-900 mb-6 text-center">{title}</h3>

        {type === 'input' && (
          <input
            ref={inputRef}
            autoFocus
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all mb-8 font-bold text-gray-700"
            placeholder={placeholder}
            defaultValue={defaultValue || ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm(e.currentTarget.value);
            }}
          />
        )}

        {type === 'confirm' && (
          <p className="text-gray-400 text-sm font-medium text-center mb-8 leading-relaxed px-4">
            此操作不可逆，请确认是否继续执行？
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 ${
              isDanger ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600' : 'bg-gray-900 shadow-gray-900/20 hover:bg-pathio-500'
            }`}
          >
            {confirmText || '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}

