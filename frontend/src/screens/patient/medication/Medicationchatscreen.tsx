import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { chatAPI } from '../../../services/api';
import { Send, Bot, User, Pill, AlertCircle } from 'lucide-react-native';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

type ParsedSegment =
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'bullet';    segments: InlineSegment[]; level: number }
  | { type: 'numbered';  segments: InlineSegment[]; index: number }
  | { type: 'heading';   text: string }
  | { type: 'divider' }
  | { type: 'tip';       segments: InlineSegment[] };

type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'emoji'; value: string };

// ─── MARKDOWN PARSER ──────────────────────────────────────────────────────────

const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

function parseInline(raw: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Split on **bold** patterns
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      segments.push({ kind: 'bold', value: part.slice(2, -2) });
    } else {
      // Split further on emojis
      const emojiParts = part.split(EMOJI_RE);
      for (const ep of emojiParts) {
        if (!ep) continue;
        if (EMOJI_RE.test(ep)) {
          EMOJI_RE.lastIndex = 0;
          segments.push({ kind: 'emoji', value: ep });
        } else {
          EMOJI_RE.lastIndex = 0;
          if (ep.trim()) segments.push({ kind: 'text', value: ep });
        }
      }
    }
  }
  return segments.length ? segments : [{ kind: 'text', value: raw }];
}

function parseMessage(text: string): ParsedSegment[] {
  const lines = text.split('\n');
  const result: ParsedSegment[] = [];
  let numberedIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Horizontal rule
    if (/^[-─═]{3,}$/.test(trimmed)) {
      result.push({ type: 'divider' });
      continue;
    }

    // Heading: ### or ## or *word*:
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      result.push({ type: 'heading', text: headingMatch[1].replace(/\*\*/g, '') });
      numberedIndex = 0;
      continue;
    }

    // Tip / note line (lines starting with 💡 or 🩺 or ⚠️)
    if (/^(💡|🩺|⚠️|ℹ️|✅|❗)/.test(trimmed)) {
      result.push({ type: 'tip', segments: parseInline(trimmed) });
      continue;
    }

    // Bullet: -, *, •
    const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
    if (bulletMatch) {
      const level = Math.floor(bulletMatch[1].length / 2);
      result.push({ type: 'bullet', segments: parseInline(bulletMatch[3]), level });
      numberedIndex = 0;
      continue;
    }

    // Numbered list: 1. 2. etc
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      numberedIndex = parseInt(numberedMatch[1], 10);
      result.push({ type: 'numbered', segments: parseInline(numberedMatch[2]), index: numberedIndex });
      continue;
    }

    // Regular paragraph
    numberedIndex = 0;
    result.push({ type: 'paragraph', segments: parseInline(trimmed) });
  }

  return result;
}

// ─── INLINE RENDERER ─────────────────────────────────────────────────────────

function renderInline(segments: InlineSegment[], baseStyle: object): React.ReactNode {
  return segments.map((seg, i) => {
    if (seg.kind === 'bold')  return <Text key={i} style={[baseStyle, styles.bold]}>{seg.value}</Text>;
    if (seg.kind === 'emoji') return <Text key={i} style={styles.inlineEmoji}>{seg.value}</Text>;
    return <Text key={i} style={baseStyle}>{seg.value}</Text>;
  });
}

// ─── RICH BOT BUBBLE ─────────────────────────────────────────────────────────

function BotBubbleContent({ text }: { text: string }) {
  const parsed = parseMessage(text);

  return (
    <View style={{ gap: 5 }}>
      {parsed.map((seg, i) => {
        switch (seg.type) {

          case 'heading':
            return (
              <View key={i} style={styles.headingRow}>
                <Text style={styles.headingText}>{seg.text}</Text>
              </View>
            );

          case 'divider':
            return <View key={i} style={styles.divider} />;

          case 'bullet':
            return (
              <View key={i} style={[styles.listRow, { paddingLeft: 8 + seg.level * 12 }]}>
                <View style={styles.bulletDot} />
                <Text style={styles.listText}>
                  {renderInline(seg.segments, styles.listText)}
                </Text>
              </View>
            );

          case 'numbered':
            return (
              <View key={i} style={styles.listRow}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>{seg.index}</Text>
                </View>
                <Text style={styles.listText}>
                  {renderInline(seg.segments, styles.listText)}
                </Text>
              </View>
            );

          case 'tip':
            return (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipText}>
                  {renderInline(seg.segments, styles.tipText)}
                </Text>
              </View>
            );

          default: // paragraph
            return (
              <Text key={i} style={styles.paraText}>
                {renderInline(seg.segments, styles.paraText)}
              </Text>
            );
        }
      })}
    </View>
  );
}

// ─── SUGGESTION CHIPS ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What medications am I on?',
  'When should I take my medications?',
  'What are the side effects?',
  'Can I take them with food?',
  'What if I miss a dose?',
];

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function MedicationChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id:        'greeting',
      role:      'assistant',
      text:      'Hello! 👋 Ask me anything about your active medications — dosage, timing, side effects, and more.',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping]   = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const buildHistory = (msgs: Message[]) =>
    msgs
      .filter(m => m.id !== 'greeting' && !m.isError)
      .map(m => ({ role: m.role, text: m.text }));

  useFocusEffect(useCallback(() => {}, []));

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? inputText).trim();
    if (!msgText || isTyping) return;

    setInputText('');

    const userMsg: Message = {
      id:        `user-${Date.now()}`,
      role:      'user',
      text:      msgText,
      timestamp: new Date(),
    };

    setMessages(prev => { scrollToBottom(); return [...prev, userMsg]; });
    setIsTyping(true);
    scrollToBottom();

    try {
      const history = buildHistory([...messages]);
      const reply   = await chatAPI.sendMessage(msgText, history);

      setMessages(prev => [...prev, {
        id:        `assistant-${Date.now()}`,
        role:      'assistant',
        text:      reply,
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      const serverMsg = error?.response?.data?.error;
      setMessages(prev => [...prev, {
        id:        `error-${Date.now()}`,
        role:      'assistant',
        text:      serverMsg || 'Something went wrong. Please check your connection and try again.',
        timestamp: new Date(),
        isError:   true,
      }]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowBot]}>

        {!isUser && (
          <View style={[styles.avatar, styles.avatarBot]}>
            <Bot size={15} color="#16a34a" />
          </View>
        )}

        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          item.isError && styles.bubbleError,
        ]}>

          {/* User messages: plain text. Bot messages: rich rendered. */}
          {isUser ? (
            <Text style={styles.textUser}>{item.text}</Text>
          ) : (
            <BotBubbleContent text={item.text} />
          )}

          <Text style={[styles.timestamp, isUser ? styles.tsUser : styles.tsBot]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>

        {isUser && (
          <View style={[styles.avatar, styles.avatarUser]}>
            <User size={15} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  const renderTyping = () => (
    <View style={[styles.messageRow, styles.rowBot]}>
      <View style={[styles.avatar, styles.avatarBot]}>
        <Bot size={15} color="#16a34a" />
      </View>
      <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: 14 }]}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, { opacity: 1   }]} />
          <View style={[styles.dot, { opacity: 0.5 }]} />
          <View style={[styles.dot, { opacity: 0.2 }]} />
        </View>
      </View>
    </View>
  );

  const showSuggestions = messages.length <= 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Pill size={20} color="#16a34a" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Medication Assistant</Text>
            <Text style={styles.headerSub}>Powered by your medication records</Text>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <View style={styles.notice}>
          <AlertCircle size={12} color="#92400e" />
          <Text style={styles.noticeText}>
            Only discusses your listed medications. Always consult your doctor for medical decisions.
          </Text>
        </View>

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={isTyping ? renderTyping() : null}
        />

        {/* ── Suggestion chips ── */}
        {showSuggestions && (
          <View style={styles.chipsWrapper}>
            <FlatList
              data={SUGGESTIONS}
              horizontal
              keyExtractor={s => s}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => sendMessage(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your medications..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnOff]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.8}
          >
            {isTyping
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send size={17} color="#fff" />
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  flex:     { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  headerSub:   { fontSize: 11, color: '#64748b', marginTop: 1 },

  // ── Notice ──
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#fde68a',
  },
  noticeText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 16 },

  // ── Message list ──
  messagesList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  rowUser:    { justifyContent: 'flex-end' },
  rowBot:     { justifyContent: 'flex-start' },

  avatar:     { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  avatarBot:  { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  avatarUser: { backgroundColor: '#16a34a' },

  bubble: {
    maxWidth: '78%', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleUser:  { backgroundColor: '#16a34a', borderBottomRightRadius: 4 },
  bubbleBot:   { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  bubbleError: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },

  // ── Rich content: paragraph ──
  paraText: {
    fontSize: 14, lineHeight: 21, color: '#1e293b',
  },

  // ── Rich content: heading ──
  headingRow: {
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    paddingBottom: 4, marginBottom: 2, marginTop: 4,
  },
  headingText: {
    fontSize: 13, fontWeight: '800',
    color: '#16a34a', letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  // ── Rich content: divider ──
  divider: {
    height: 1, backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },

  // ── Rich content: bullet ──
  listRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginVertical: 1,
  },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#16a34a',
    marginTop: 7.5, flexShrink: 0,
  },
  listText: {
    flex: 1, fontSize: 14, lineHeight: 21, color: '#1e293b',
  },

  // ── Rich content: numbered ──
  numberBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1, borderColor: '#bbf7d0',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 1,
  },
  numberBadgeText: {
    fontSize: 11, fontWeight: '700', color: '#16a34a',
  },

  // ── Rich content: tip / note ──
  tipRow: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3, borderLeftColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    marginVertical: 2,
  },
  tipText: {
    fontSize: 13, lineHeight: 19, color: '#15803d',
  },

  // ── Bold inline ──
  bold: { fontWeight: '700', color: '#1e293b' },

  // ── Emoji inline ──
  inlineEmoji: { fontSize: 15 },

  // ── User bubble text ──
  textUser: { fontSize: 14, lineHeight: 21, color: '#fff' },

  // ── Timestamps ──
  timestamp: { fontSize: 10, marginTop: 6 },
  tsUser:    { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  tsBot:     { color: '#94a3b8' },

  // ── Typing dots ──
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 16 },
  dot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94a3b8' },

  // ── Suggestion chips ──
  chipsWrapper: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10 },
  chipsList:    { paddingHorizontal: 16, gap: 8 },
  chip:         {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 110,
    backgroundColor: '#f8fafc',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#1e293b',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#94a3b8' },
});