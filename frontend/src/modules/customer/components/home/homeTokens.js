export const SERIF = "'Playfair Display', Georgia, serif";
export const EASE = [0.22, 1, 0.36, 1];

/** Section entrance used across the home screen. */
export const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.06, ease: EASE } }),
};
