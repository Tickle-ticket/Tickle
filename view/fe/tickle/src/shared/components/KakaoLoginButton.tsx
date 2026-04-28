import { Button } from './Button';

interface KakaoLoginButtonProps {
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

function KakaoSymbol() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-black">
      <path d="M12 2.5C6.2 2.5 1.5 6.1 1.5 10.6c0 2.9 1.9 5.5 4.8 6.9l-1.1 4.1c-.1.4.3.7.7.5l4.8-3.2c.4 0 .8.1 1.3.1 5.8 0 10.5-3.6 10.5-8.1S17.8 2.5 12 2.5z" />
    </svg>
  );
}

export function KakaoLoginButton({
  className = '',
  disabled = false,
  onClick,
}: KakaoLoginButtonProps) {
  return (
    <Button
      type="button"
      display="block"
      size="xlarge"
      disabled={disabled}
      onClick={onClick}
      aria-label="카카오 로그인"
      className={className}
      htmlStyle={{
        backgroundColor: '#FEE500',
        color: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '12px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '18px',
        fontWeight: 700,
      }}
    >
      <span className="flex items-center justify-center gap-2.5">
        <KakaoSymbol />
        <span className="tracking-[-0.02em]">카카오 로그인</span>
      </span>
    </Button>
  );
}

export default KakaoLoginButton;
