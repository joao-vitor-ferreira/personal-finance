import { useCreditCards } from "@/hooks/use-credit-card";
import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const creditCardHome = () => {
    const { data = [], isLoading, isRefetching, refetch, error } = useCreditCards();

    if (isLoading) {
        return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator />
        </View>
        );
    }

    if (error) {
        return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <Text>{error.message}</Text>
        </View>
        );
    }

    return (
        <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text>Nenhum cartão cadastrado.</Text>}
        renderItem={({ item }) => (
            <View style={{ padding: 16, borderWidth: 1, borderRadius: 12, gap: 4 }}>
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            <Text>{item.brand} •••• {item.lastFourDigits}</Text>
            </View>
        )}
        />
    );
}


export default creditCardHome;