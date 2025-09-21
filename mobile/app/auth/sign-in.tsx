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

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple validation: email format and min password length
  const valid = useMemo(() => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return okEmail && pw.length >= 6;
  }, [email, pw]);

  const onSubmit = async () => {
    if (!valid || loading) return;
    try {
      setErr(null);
      setLoading(true);
      await signIn(email, pw);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.page}>
      {/* Keep inputs visible when the keyboard shows */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Space-between keeps the hero visually near the bottom */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {/* Top: header + form */}
          <View>
            {/* Header: logo + title */}
            <View style={s.header}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={s.logo}
              />
              <Text style={s.title}>Sign in Sunshine</Text>
            </View>

            {/* Form block */}
            <View style={s.form}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.buttonText}>Sign in</Text>
                )}
              </Pressable>

              <Link href="/auth/register" asChild>
                <TouchableOpacity style={s.linkWrap}>
                  <Text style={s.linkText}>New parent? Create account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Bottom hero image: not flush with the edge */}
          <Image
            source={require("../../assets/images/welcome.jpg")}
            style={s.heroBottom}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
