import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useSession } from '@/context/session';

const SignIn = () => {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    try {
      setError(null);
      await signIn(email, password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no login.');
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <TextInput
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button title="Entrar" onPress={handleSignIn} />
    </View>
  );
}

export default SignIn;