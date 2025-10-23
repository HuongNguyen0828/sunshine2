// mobile/auth/sign-in.tsx
import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, Link } from "expo-router";
import { signIn } from "@/lib/auth";
import { colors } from "@/constants/color";
import { signInStyles as s } from "@/styles/screens/signIn";

const norm = (v: string) => v.trim().toLowerCase();

function prettyError(code?: string, message?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-disabled":
      return "Account is disabled. Contact support.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return message || "Sign-in failed. Please try again.";
  }
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = useMemo(() => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return okEmail && pw.length >= 6;
  }, [email, pw]);

  const onSubmit = async () => {
    if (!valid || loading) return;
    try {
      setErr(null);
      setLoading(true);

      const user = await signIn(norm(email), pw);
      const token = await user.getIdTokenResult(true);
      const role = (token.claims?.role as string | undefined) || "";

      if (role === "teacher") router.replace("/teacher" as any);
      else if (role === "parent") router.replace("/parent" as any);
      else router.replace("/" as any);
    } catch (e: any) {
      setErr(prettyError(e?.code, e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <View>
            <View style={s.header}>
              <Image source={require("../../assets/images/logo.png")} style={s.logo} />
              <Text style={s.title}>Sign in</Text>
            </View>

            <View style={s.form}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                placeholderTextColor={colors.textDim}
                style={s.input}
              />
              <TextInput
                placeholder="Password"
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                textContentType="password"
                placeholderTextColor={colors.textDim}
                style={s.input}
              />

              {!!err && <Text style={s.error}>{err}</Text>}

              <Pressable
                onPress={onSubmit}
                disabled={!valid || loading}
                style={[s.button, (!valid || loading) && s.buttonDisabled]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign in</Text>}
              </Pressable>

              <Link href="/auth/register" asChild>
                <TouchableOpacity style={s.linkWrap}>
                  <Text>
                    New parent? <Text style={s.linkText}>Create account</Text>
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          <Image source={require("../../assets/images/welcome.jpg")} style={s.heroBottom} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
