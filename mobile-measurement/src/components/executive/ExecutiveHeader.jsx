// Fixed page header for the executive tab screens. It is rendered outside the scrolling area
// (see withExecutiveTab's `header` option), so it stays put while the page scrolls under it.
import React from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigate } from '../../lib/nav';
import { Box, Btn, I, Txt } from '../ui/primitives';

/**
 * variant "purple": brand-coloured bar with a back arrow and a centred title (Wallet, Profile).
 * variant "white":  white bar with an icon tile, title and subtitle (Requests).
 */
export default function ExecutiveHeader({ title, subtitle, icon, variant = 'purple', back = true }) {
  const navigate = useNavigate();

  if (variant === 'white') {
    return (
      <Box className="bg-white border-b border-gray-100 px-4 py-3 flex flex-row items-center gap-3 shadow-sm z-20">
        {icon ? (
          <Box className="w-10 h-10 rounded-xl bg-[#843D9B] flex items-center justify-center shrink-0">
            <I icon={icon} size={20} strokeWidth={2.5} color="#ffffff" />
          </Box>
        ) : null}
        <Box className="min-w-0 flex-1">
          <Txt className="text-lg font-black text-gray-900 tracking-tight" numberOfLines={1}>{title}</Txt>
          {subtitle ? <Txt className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5" numberOfLines={1}>{subtitle}</Txt> : null}
        </Box>
      </Box>
    );
  }

  return (
    <Box className="bg-[#843D9B] px-4 py-3.5 flex flex-row items-center shadow-md z-20">
      {back ? (
        <Btn onPress={() => navigate(-1)} accessibilityLabel="Back" className="p-1.5 -ml-1.5">
          <I icon={ArrowLeft} size={22} color="#ffffff" />
        </Btn>
      ) : <Box className="w-8" />}
      <Txt className="flex-1 text-center text-base font-black tracking-tight uppercase text-white pr-8" numberOfLines={1}>{title}</Txt>
    </Box>
  );
}
