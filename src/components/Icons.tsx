export function WorldMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 30 : 42}
      height={small ? 30 : 42}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="m5 26 18-10 20 10-18 15Z" fill="#789861" />
      <path d="m5 26 20 10 18-10-6 11-12 7-13-7Z" fill="#ae8d64" />
      <path d="m16 23 10-6 10 6-10 6Z" fill="#e9dabe" />
      <path d="M18 22v-8l8-4 7 5v8l-7 4Z" fill="#f2e6ca" />
      <path d="m14 15 11-8 12 9-6 3-7-7-5 6Z" fill="#bd7051" />
      <path d="M26 27v-7l4-2v7Z" fill="#655742" />
      <path d="M10 28V15" stroke="#6e6044" strokeWidth="2.5" />
      <ellipse cx="10" cy="14" rx="5.5" ry="7" fill="#799954" />
    </svg>
  );
}
