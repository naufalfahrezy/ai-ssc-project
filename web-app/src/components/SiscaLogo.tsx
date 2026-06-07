import React from 'react';

export default function SiscaLogo({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`flex-shrink-0 shadow-sm ${className}`}
        >
            {/* Background Gradient Merah Telkom */}
            <rect width="32" height="32" rx="8" fill="url(#sisca_gradient)" />

            {/* Garis membentuk huruf 'S' (Sisca) */}
            <path
                d="M21 11.5C21 10.1193 19.8807 9 18.5 9H13.5C12.1193 9 11 10.1193 11 11.5C11 12.8807 12.1193 14 13.5 14H18.5C19.8807 14 21 15.1193 21 16.5C21 17.8807 19.8807 19 18.5 19H13.5C12.1193 19 11 17.8807 11 16.5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Ekor Chat Bubble menandakan ini AI Chatbot */}
            <path
                d="M23 23L19.5 19.5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Titik Kuning sebagai aksen "Sparkle" / AI Node */}
            <circle cx="21" cy="9" r="2" fill="#FBBF24" />

            <defs>
                <linearGradient
                    id="sisca_gradient"
                    x1="0"
                    y1="0"
                    x2="32"
                    y2="32"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#E3000F" />
                    <stop offset="1" stopColor="#B30009" />
                </linearGradient>
            </defs>
        </svg>
    );
}