import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, router } from "expo-router";
import axios from "axios";

export const registerParentAPI = async (data: { name: string; email: string }) => {
  const res = await axios.post("http://localhost:4000/parents/register", data);
  return res.data;
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = useMemo(() => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const okName = name.trim().length >= 2;
    const okPw = pw.length >= 6 && pw === pw2;
    return okEmail && okName && okPw;
  }, [name, email, pw, pw2]);

  const onSubmit = async () => {
    if (!valid || loading) return;
    try {
      setErr(null);
      setLoading(true);
      await registerParent(name, email, pw);
      router.replace("/");
    } catch (e: any) {
      const m =
        e?.code === "auth/email-already-in-use"
          ? "This email is already in use."
          : e?.message || "Failed to create account.";
      setErr(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          gap: 16,
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 4 }}>
          Create account
        </Text>

        <View style={{ gap: 10 }}>
          <TextInput
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 10,
            }}
          />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 10,
            }}
          />
          <TextInput
            placeholder="Password (min 6)"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            textContentType="password"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 10,
            }}
          />
          <TextInput
            placeholder="Confirm password"
            value={pw2}
            onChangeText={setPw2}
            secureTextEntry
            textContentType="password"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 10,
            }}
          />
        </View>

        {err ? <Text style={{ color: "#d00" }}>{err}</Text> : null}

        <Pressable
          onPress={onSubmit}
          disabled={!valid || loading}
          style={{
            backgroundColor: !valid || loading ? "#bbb" : "#1e90ff",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Create account
            </Text>
          )}
        </Pressable>

        <View style={{ alignItems: "center", marginTop: 8, gap: 6 }}>
          <Link href="/auth/sign-in" asChild>
            <Pressable>
              <Text style={{ color: "#1e90ff" }}>Already have an account? Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
