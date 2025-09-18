import {FC} from "react"
import { View, Text, StyleSheet} from "react-native"
import {colors } from "@/constants/color"
import { fontSize, fontWeight} from "@/constants/typography"
import { Entry } from "@/features/types"
import {emojiCollection} from "@/components/emoji"

// Functional component for a single Entry
export const EntryCard: FC<{entry: Entry}> = ({entry}) => {
    const entryType = entry.type.toLowerCase() as keyof typeof emojiCollection;
    const emoji = emojiCollection[entryType] || "❓"; // Fall back if cannot found match
    return (
        <View style={styles.card}>
            <Text style={styles.entryType}>{emoji} {entry.type}</Text>
            <Text style={styles.subType}>{entry.subtype}</Text>
            <Text style={styles.detail}>{entry.detail}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFF", 
        padding: 12, 
        borderRadius: 10,
        marginVertical: 8,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4, 
        elevation: 2,
    },
    entryType: {
        fontSize: fontSize.lg, 
        fontWeight: fontWeight.bold,
        color: colors.heading,
        marginBottom: 8,
    },
    subType: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.medium,
        marginBottom: 6,
    },
    detail: {
        fontSize: fontSize.md,
        color: "#333",
        marginBottom: 4
    }
})
