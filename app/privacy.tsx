import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={16} color={colors.accent} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <Text style={styles.title}>PRIVACY POLICY</Text>

        <Text style={styles.body}>
          {`Last updated: June 2024\n\nCrewDay is a personal challenge tracking app. Here is how we handle your data:\n\n`}
          {`DATA WE COLLECT\n\nWe collect the email address and display name you provide when you sign up. We store your daily challenge progress, custom tasks, and optional fitness data (weight, height, mood) in Firebase Firestore.\n\n`}
          {`HOW WE USE YOUR DATA\n\nYour data is used solely to display your challenge progress to you and your friends within the app. We do not sell, share, or use your data for advertising.\n\n`}
          {`FIREBASE\n\nThis app uses Google Firebase for authentication and data storage. Firebase may collect usage analytics. See Google's privacy policy at policies.google.com/privacy.\n\n`}
          {`YOUR RIGHTS\n\nYou can delete your account and all associated data by contacting us. You can also edit your profile information at any time.\n\n`}
          {`CONTACT\n\nFor privacy questions, contact eli.patrick.manning@gmail.com.`}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  title: { fontFamily: fonts.pixel, fontSize: 12, color: colors.accent, marginBottom: 24, lineHeight: 20 },
  body: { fontFamily: fonts.inter, fontSize: 13, color: colors.text, lineHeight: 22 },
});
