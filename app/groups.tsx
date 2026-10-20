import { Redirect } from 'expo-router';

/** meshradar://groups from join-request notifications. */
export default function GroupsLink() {
  return <Redirect href="/me/groups" />;
}
