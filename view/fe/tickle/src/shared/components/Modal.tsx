import React, { useEffect } from 'react';
import { Box } from './Box';
import { Button } from './Button';
import { Title } from './Title';
import { Text } from './Text';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  showCancelButton?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  isConfirmDisabled?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  cancelText = '취소',
  confirmText = '확인',
  showCancelButton = true,
  onCancel,
  onConfirm,
  isLoading = false,
  className = '',
  isConfirmDisabled = false,
  children
}: ModalProps) => {
  
  // 모달이 열려있을 때 뒷배경 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 딤 배경 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      {/* 모달 콘텐츠 */}
      <Box 
        variant="shadow" 
        className={`relative w-full max-w-[320px] bg-white rounded-[20px] p-6 flex flex-col z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        <div className="flex flex-col items-center mb-6 gap-2 text-center">
          {title && (
             // Title 컴포넌트 활용 지시사항 반영
            <Title 
              title={title} 
              transparent 
              bottomBorder={false} 
              className="!px-0 !pb-0 [&_h1]:text-center [&>div]:!px-0" 
            />
          )}
          {description && (
            <Text typography="t5" color="secondary" className="whitespace-pre-wrap leading-relaxed mt-2 text-center break-keep">
              {description}
            </Text>
          )}
          {children}
        </div>
        
        <div className="flex gap-2 w-full mt-auto">
          {showCancelButton && cancelText && (
            // Button 컴포넌트 활용 지시사항 반영 (weak / dark 조합이 회색 배경의 회색 글씨)
            <Button 
              variant="weak" 
              color="dark" 
              display="block" 
              onClick={handleCancel}
              disabled={isLoading}
              size="medium"
              className="flex-1 rounded-[12px] !font-semibold transition-colors hover:bg-gray-200"
            >
              {cancelText}
            </Button>
          )}
          {confirmText && (
            <Button 
              variant="fill" 
              color="primary" 
              display="block" 
              onClick={handleConfirm}
              isLoading={isLoading}
              disabled={isConfirmDisabled}
              size="medium"
              className="flex-1 rounded-[12px] !font-semibold"
            >
              {confirmText}
            </Button>
          )}
        </div>
      </Box>
    </div>
  );
};
