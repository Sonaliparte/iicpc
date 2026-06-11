import { useState, useEffect } from 'react';

export interface CountdownTime {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

export const useCountdown = (targetDateStr: string = '2026-06-10T23:59:59') => {
  const calculateTimeLeft = (): CountdownTime => {
    const difference = +new Date(targetDateStr) - +new Date();
    let timeLeft: CountdownTime = {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isExpired: true,
    };

    if (difference > 0) {
      const d = Math.floor(difference / (1000 * 60 * 60 * 24));
      const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const m = Math.floor((difference / 1000 / 60) % 60);
      const s = Math.floor((difference / 1000) % 60);

      timeLeft = {
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
        isExpired: false,
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDateStr]);

  return timeLeft;
};
