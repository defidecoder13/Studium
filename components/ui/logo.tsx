import React from 'react'

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  className?: string
  showBadge?: boolean
}

export function StudiumLogo({
  size = 20,
  className = '',
  showBadge = false,
  ...props
}: LogoProps) {
  if (showBadge) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        <rect width="24" height="24" rx="6" className="fill-black dark:fill-white" />
        <path
          d="M17 6.5H10C8.067 6.5 6.5 8.067 6.5 10C6.5 11.933 8.067 13.5 10 13.5H14C15.933 13.5 17.5 15.067 17.5 17C17.5 18.933 15.933 20.5 14 20.5H7"
          className="stroke-white dark:stroke-black"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.8 8.8L15.2 15.2"
          className="stroke-white dark:stroke-black"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M17 6.5H10C8.067 6.5 6.5 8.067 6.5 10C6.5 11.933 8.067 13.5 10 13.5H14C15.933 13.5 17.5 15.067 17.5 17C17.5 18.933 15.933 20.5 14 20.5H7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8.8L15.2 15.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
