import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReaderScreen({ route }) {
    // Отримуємо параметри, передані з каталогу
    const { title } = route.params;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ви читаєте:</Text>
            <Text style={styles.bookTitle}>{title}</Text>
            <Text style={styles.placeholder}>Тут з'явиться сам текст або PDF-файл книги.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 18, color: '#666' },
    bookTitle: { fontSize: 24, fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
    placeholder: { marginTop: 20, fontStyle: 'italic', color: '#999' }
});