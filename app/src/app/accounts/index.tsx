import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const accountHome = () => {
    return (
        <ScrollView>
            <Text>
                crédit Card
            </Text>
            <TextInput
                placeholder="Search"
            />
        </ScrollView>
    );
}


export default accountHome;