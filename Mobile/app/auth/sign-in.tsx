import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from "react-native";
import { router, Link } from "expo-router";
import { signIn } from "@/lib/auth";
import { colors } from "@/constants/color"


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
      await signIn(email, pw);
      router.replace("/");
    } catch (e: any) {
      const msg =
        e?.code === "auth/invalid-credential"
          ? "Email or password is incorrect."
          : e?.message || "Failed to sign in";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={styles.container}
    >
      <View
        style={styles.loginContainer}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 4, textAlign: 'center', color: colors.heading}}>
          Sign in Sunshine
        </Text>

        <View style={{ gap: 10 }}>
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
              color: "#000"
            }}
          />
          <TextInput
            placeholder="Password"
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
              Sign in
            </Text>
          )}
        </Pressable>

        <View style={{ alignItems: "center", marginTop: 8}}>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: "#1e90ff" }}>
                New parent? Create account
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
     
      </View>
      <View style={{ alignItems: "center"}}> 
        <Image 
          source={require('../../assets/images/welcome.jpg')} 
          alt="welcome" 
          style={{
          width: 500,
          height: 300,
          resizeMode: 'contain',
        }}
        />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, 
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 10 : 0
  }, 
  loginContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 400,
    padding: 24,
    gap: 16,
    justifyContent: "center",
    backgroundColor: "#fff",
  }

});