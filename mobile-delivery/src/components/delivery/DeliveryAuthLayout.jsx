// Port of modules/delivery/layouts/DeliveryAuthLayout.jsx — white full-page shell for login/signup/forgot/reset.
import React, { useCallback } from 'react';
import Screen from '../common/Screen';
import { Box, Scroll } from '../ui/primitives';

// The auth pages scroll inside this layout, so a screen (e.g. the signup steps) asks it to jump to the top.
let authScroll = null;
export const scrollAuthToTop = (animated = false) => authScroll?.scrollTo({ y: 0, animated });

// purple: solid brand background (login screen only; signup/forgot stay white).
export default function DeliveryAuthLayout({ children, isSignup = false, purple = false }) {
  const setScrollRef = useCallback((node) => { authScroll = node; }, []);
  return (
    <Screen className={purple ? 'bg-[#7B2591]' : 'bg-white'} statusBar={purple ? 'light' : 'dark'}>
      <Scroll ref={setScrollRef} className="flex-1" contentClassName="px-4 py-6 pt-5 pb-5" contentContainerStyle={{ flexGrow: 1 }}>
        <Box className={`w-full ${isSignup ? 'max-w-[620px]' : 'max-w-[400px]'} mx-auto flex flex-col items-center`}>{children}</Box>
      </Scroll>
    </Screen>
  );
}

export const withDeliveryAuthLayout = (ScreenComponent, opts = {}) => {
  const Wrapped = (props) => (
    <DeliveryAuthLayout isSignup={opts.isSignup} purple={opts.purple}>
      <ScreenComponent {...props} />
    </DeliveryAuthLayout>
  );
  Wrapped.displayName = `withDeliveryAuthLayout(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
  return Wrapped;
};
