import React from 'react';

/**
 * Hand-drawn line icons for the home shortcut row (dress form, lehenga, flower, fabric, scissors).
 * They use currentColor, so the parent's text colour sets the stroke.
 */
const Svg = ({ size = 26, children, ...rest }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
    >
        {children}
    </svg>
);

/** Dress on a tailor's stand. */
export const DressFormIcon = (props) => (
    <Svg {...props}>
        <path d="M12 1.6v1.6" />
        <path d="M10.4 3.2h3.2" />
        <path d="M9.2 3.6c.4 1.4 1.4 2.2 2.8 2.2s2.4-.8 2.8-2.2" />
        <path d="M9.2 3.6 8.4 5.2l1 4.6h5.2l1-4.6-.8-1.6" />
        <path d="M9.4 9.8 6.8 16.4c3.4 1 7 1 10.4 0l-2.6-6.6" />
        <path d="M12 6.4v3.4M12 11.4v.01M12 13.2v.01M12 15v.01" />
        <path d="M8.6 12.4c2.2.5 4.6.5 6.8 0" strokeDasharray="0.6 1.1" />
        <path d="M12 17.2v4.2M9.4 21.4h5.2" />
    </Svg>
);

/** Flared lehenga with blouse and embroidered border. */
export const LehengaIcon = (props) => (
    <Svg {...props}>
        <path d="M9.6 2.4 10.4 5h3.2l.8-2.6" />
        <path d="M9 5h6l-.6 3.4H9.6Z" />
        <path d="M9.6 8.4 4 19.2c5.2 2 10.8 2 16 0L14.4 8.4" />
        <path d="M12 8.4v12.2M10.6 8.4 7.6 20.2M13.4 8.4l3 11.8" />
        <path d="M6.6 15.6c3.6 1.1 7.2 1.1 10.8 0" strokeDasharray="0.6 1.2" />
        <path d="M5 18.2c4.6 1.4 9.4 1.4 14 0" />
    </Svg>
);

/** Eight-petal embroidery flower. */
export const FlowerIcon = (props) => (
    <Svg {...props}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse key={deg} cx="12" cy="6.4" rx="2.3" ry="3.6" transform={`rotate(${deg} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
);

/** Stack of three folded fabrics. */
export const FabricIcon = (props) => (
    <Svg {...props}>
        <path d="M6.6 4.4h12a1.6 1.6 0 0 1 0 3.2h-12a1.6 1.6 0 0 1 0-3.2Z" />
        <path d="M4.6 9.6h14.8a1.7 1.7 0 0 1 0 3.4H4.6a1.7 1.7 0 0 1 0-3.4Z" />
        <path d="M3.4 15h17.2a1.8 1.8 0 0 1 0 3.6H3.4a1.8 1.8 0 0 1 0-3.6Z" />
        <path d="M8.4 6h8.2M7 11.3h10M6 16.8h12" strokeDasharray="0.6 1.2" />
        <path d="M14.6 18.6v2.2l1.2-.8 1.2.8v-2.2" />
    </Svg>
);

/** Open tailoring scissors. */
export const ScissorsIcon = (props) => (
    <Svg {...props}>
        <circle cx="6" cy="6.4" r="2.8" />
        <circle cx="6" cy="17.6" r="2.8" />
        <path d="M8.2 8.1 21 17.4" />
        <path d="M8.2 15.9 21 6.6" />
        <circle cx="13" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </Svg>
);
