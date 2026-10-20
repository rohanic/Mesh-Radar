import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { QUICK_REPLIES } from '@/core/engine/quickReplies';
import i18n, { setLanguage } from '@/i18n';
import { QuickReplyTray } from '../QuickReplyTray';
import { HOLD_MS, SosButton } from '../SosButton';

const wrap = (ui: ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);

// RNTL 14: render, fireEvent and act are async (React 19 rendering).

describe('SOS button (E1)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires only after a 3 second hold', async () => {
    const onFire = jest.fn();
    await wrap(<SosButton onFire={onFire} />);
    const button = screen.getByTestId('sos-button');
    await fireEvent(button, 'pressIn');
    await act(() => jest.advanceTimersByTime(HOLD_MS - 500));
    expect(onFire).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(1_000));
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('cancels when released early', async () => {
    const onFire = jest.fn();
    await wrap(<SosButton onFire={onFire} />);
    const button = screen.getByTestId('sos-button');
    await fireEvent(button, 'pressIn');
    await act(() => jest.advanceTimersByTime(1_500));
    await fireEvent(button, 'pressOut');
    await act(() => jest.advanceTimersByTime(HOLD_MS));
    expect(onFire).not.toHaveBeenCalled();
  });
});

describe('quick replies (D2)', () => {
  afterEach(async () => {
    await act(() => setLanguage('en'));
  });

  it('shows every quick reply and sends its code', async () => {
    const onPick = jest.fn();
    await wrap(<QuickReplyTray onPick={onPick} />);
    for (const q of QUICK_REPLIES) expect(screen.getByTestId(`quick-${q.code}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('quick-1'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ code: 1 }));
  });

  it('shows the same coded reply in the reader language', async () => {
    await act(async () => {
      await i18n.changeLanguage('ur');
    });
    await wrap(<QuickReplyTray onPick={() => undefined} />);
    expect(screen.getByText(i18n.t('quick.1'))).toBeTruthy();
    expect(i18n.t('quick.1')).not.toBe('I\'m OK');
  });
});
