
import React from 'react';

interface LogoProps {
  variant?: 'audit' | 'conseil' | 'both';
  className?: string;
  size?: number;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ variant = 'both', className = '', size = 40, showText = true }) => {
  const isAudit = variant === 'audit';
  const isConseil = variant === 'conseil';
  const isBoth = variant === 'both';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex -space-x-2">
        {(isBoth || isAudit) && (
          <div style={{ width: size, height: size }} className="relative shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
              <defs>
                <radialGradient id="gradAudit" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                  <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#0369a1', stopOpacity: 1 }} />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#gradAudit)" />
              <text x="50" y="65" textAnchor="middle" fill="white" style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'Arial, sans-serif' }}>SO</text>
            </svg>
          </div>
        )}
        {(isBoth || isConseil) && (
          <div style={{ width: size, height: size }} className="relative shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
              <defs>
                <radialGradient id="gradConseil" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                  <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#gradConseil)" />
              <text x="50" y="65" textAnchor="middle" fill="white" style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'Arial, sans-serif' }}>SO</text>
            </svg>
          </div>
        )}
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-slate-900 font-black tracking-tighter uppercase" style={{ fontSize: size * 0.4 }}>
            {isAudit ? 'Audit' : isConseil ? 'Conseil' : 'Audit & Conseil'}
          </span>
          <div className="flex gap-1 mt-1">
             <div className={`w-1 h-1 rounded-full ${isConseil ? 'bg-amber-500' : 'bg-sky-500'}`}></div>
             <div className="w-1 h-1 rounded-full bg-slate-300"></div>
             <div className="w-1 h-1 rounded-full bg-slate-200"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
