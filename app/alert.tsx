import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';

/** Landing route for notification taps (meshradar://alert?type=...); the AlertHost shows them. */
export default function AlertRoute() {
  const { type, group, member } = useLocalSearchParams<{ type?: string; id?: string; group?: string; member?: string }>();
  useEffect(() => {
    void (async () => {
      if (type === 'sos') {
        const s = await MeshEngine.sosState();
        useMesh.setState({ sos: s });
        const first = s.incoming[0];
        if (first) useMesh.setState((st) => ({ alerts: [...st.alerts.filter((a) => a.id !== `sos:${first.sosId}`), { id: `sos:${first.sosId}`, kind: 'sos', sos: first }] }));
        router.replace('/');
      } else if (type === 'checkin' && group) {
        router.replace({ pathname: '/group/checkin', params: { id: group, member } });
      } else if (type === 'crowd') {
        router.replace('/event/day');
      } else {
        router.replace('/');
      }
    })();
  }, [type, group, member]);
  return null;
}
