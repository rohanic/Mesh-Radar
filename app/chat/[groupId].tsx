import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { quickReply, type QuickReply } from '@/core/engine/quickReplies';
import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { errorKey } from '@/features/engine/boot';
import { pickPhoto } from '@/features/profile/avatarPhoto';
import { MeshEngine } from 'mesh-engine';
import { loadMessages, useMesh } from '@/state/mesh';
import { recordCheckin } from '@/state/social';
import { Button, Header, IconButton, ListRow, Notice, Row, Text } from '@/ui/components';
import { QuickReplyTray } from '@/ui/components/QuickReplyTray';
import { SosButton } from '@/ui/components/SosButton';

/** Group chat and direct messages (D1, D2, D3, D5, D6), end-to-end encrypted by the engine. */
export default function ChatScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { groupId, peer, pickPin } = useLocalSearchParams<{ groupId: string; peer?: string; pickPin?: string }>();
  const detail = useMesh((s) => s.details[groupId]);
  const all = useMesh((s) => s.messages[groupId]);
  const photos = useMesh((s) => s.photos);
  const own = useMesh((s) => s.own);
  const setOpenChat = useMesh((s) => s.setOpenChat);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pinPicker, setPinPicker] = useState(pickPin === '1');
  const list = useRef<FlatList>(null);
  const peerMember = peer ? detail?.members.find((m) => m.id === peer) : undefined;

  const messages = useMemo(
    () =>
      (all ?? []).filter((m) => m.kind !== 'system' && (peer ? m.recipientId != null && (m.senderId === peer || m.recipientId === peer) : m.recipientId == null)),
    [all, peer],
  );

  useEffect(() => {
    setOpenChat(groupId);
    void loadMessages(groupId, peer ?? null);
    return () => setOpenChat(null);
  }, [groupId, peer, setOpenChat]);

  // Read receipts for what is on screen (D3).
  useEffect(() => {
    const unread = messages.filter((m) => !m.outgoing).map((m) => m.msgId);
    if (unread.length) void MeshEngine.markRead(groupId, unread.slice(-32));
  }, [messages, groupId]);

  const send = async (opts: Parameters<typeof MeshEngine.sendChat>[0]) => {
    setError(null);
    try {
      await MeshEngine.sendChat({ ...opts, recipientId: peer ?? null });
      list.current?.scrollToEnd({ animated: !theme.reduceMotion });
    } catch (e) {
      setError(t(errorKey(e)));
    }
  };

  const onQuick = (q: QuickReply) => {
    if (q.needsPin) {
      setPinPicker(true);
      return;
    }
    if (q.code === 1) recordCheckin();
    void send({ groupId, kind: 'quick', text: '', quickCode: q.code });
  };

  if (!detail) return null;
  const chars = [...draft].length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={{ paddingHorizontal: space.lg }}>
          <Header title={peerMember ? `${t('chat.direct')}: ${peerMember.name}` : detail.name} right={<SosButton compact onFire={() => router.push('/sos?fire=1')} />} />
        </View>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.msgId}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text tone="muted">{t('chat.empty')}</Text>}
          renderItem={({ item }) => (
            <MessageBubble
              m={item}
              sender={detail.members.find((x) => x.id === item.senderId)}
              pins={detail.pins}
              total={detail.memberCount}
              photoUri={item.refId ? photos[item.refId] : undefined}
              onRequestPhoto={() => item.refId && void MeshEngine.requestPhoto(groupId, item.refId)}
              onOpenLocation={(lat, lon, label) => router.push({ pathname: '/find', params: { lat: String(lat), lon: String(lon), label } })}
            />
          )}
        />
        <View style={{ padding: space.md, gap: space.sm, borderTopWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
          <QuickReplyTray onPick={(q) => onQuick(quickReply(q.code)!)} />
          {error ? <Notice tone="warning" text={error} /> : null}
          <Row>
            <IconButton
              icon="image"
              label={t('chat.photo')}
              onPress={async () => {
                const p = await pickPhoto();
                if (!p) return;
                try {
                  await MeshEngine.sendThumbnail({ groupId, recipientId: peer ?? null, caption: '', image: p.thumb, photoUri: p.uri, fullSize: p.size || 1 });
                } catch (e) {
                  setError(t(errorKey(e)));
                }
              }}
            />
            <IconButton icon="locate" label={t('chat.location')} onPress={() => own && void send({ groupId, kind: 'location', text: '', quickCode: 0, lat: own.lat, lon: own.lon })} />
            <TextInput
              testID="chat-input"
              accessibilityLabel={t('chat.placeholder')}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxFontSizeMultiplier={2}
              style={{
                flex: 1,
                minHeight: theme.touch,
                maxHeight: 120,
                borderRadius: radius.chip,
                backgroundColor: theme.colors.surfaceRaised,
                color: theme.colors.text,
                paddingHorizontal: space.md,
                fontFamily: theme.fonts.regular,
                fontSize: theme.size('body'),
                textAlign: theme.rtl ? 'right' : 'left',
              }}
            />
            <IconButton
              testID="chat-send"
              icon="send"
              label={t('common.send')}
              tone={theme.colors.primary}
              onPress={() => {
                const text = draft.trim();
                if (!text || chars > 500) return;
                setDraft('');
                void send({ groupId, kind: 'text', text, quickCode: 0 });
              }}
            />
          </Row>
          {chars > 450 ? (
            <Text variant="caption" tone={chars > 500 ? 'sos' : 'muted'}>
              {chars} / 500
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <Modal transparent visible={pinPicker} animationType="slide" onRequestClose={() => setPinPicker(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
          <View style={{ backgroundColor: theme.colors.surface, padding: space.xl, gap: space.sm, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet }}>
            <Text variant="title">{t('chat.pickPin')}</Text>
            {detail.pins.length === 0 ? <Text tone="muted">{t('chat.noPins')}</Text> : null}
            {detail.pins.map((p) => (
              <ListRow
                key={p.id}
                icon="map-pin"
                title={p.name}
                onPress={() => {
                  setPinPicker(false);
                  void send({ groupId, kind: 'quick', text: '', quickCode: 4, refId: p.id });
                }}
              />
            ))}
            <Button variant="secondary" label={t('common.close')} onPress={() => setPinPicker(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
