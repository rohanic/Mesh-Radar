import { Redirect } from 'expo-router';

/** meshradar://radar from the persistent notification. */
export default function RadarLink() {
  return <Redirect href="/" />;
}
