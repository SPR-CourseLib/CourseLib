import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, Alert, Modal, TextInput, Button, Image
} from 'react-native';
import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, BASE_URL } from '../api/client';

export default function ArchiveScreen() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Стейт для пошуку, сортування та РЕЖИМУ РОЗМІТКИ
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('date_desc');
    const [sortModalVisible, setSortModalVisible] = useState(false);
    const [layoutMode, setLayoutMode] = useState('list'); // 'list', 'grid2', 'grid3'

    // Стейт для масового завантаження
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadAuthor, setUploadAuthor] = useState('');
    const [uploadTags, setUploadTags] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Стейт для редагування
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editAuthor, setEditAuthor] = useState('');
    const [editTags, setEditTags] = useState('');

    useEffect(() => { fetchDocuments(); }, []);

    const fetchDocuments = async () => {
        try {
            const response = await apiClient.get('/books/');
            setDocuments(response.data);
        } catch (error) { console.error("Помилка завантаження:", error); }
        finally { setLoading(false); }
    };

    const getProcessedDocuments = () => {
        let processed = [...documents];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            processed = processed.filter(doc =>
                doc.title.toLowerCase().includes(query) ||
                (doc.author && doc.author.toLowerCase().includes(query)) ||
                (doc.tags && doc.tags.toLowerCase().includes(query))
            );
        }
        processed.sort((a, b) => {
            switch (sortOption) {
                case 'title_asc': return a.title.localeCompare(b.title);
                case 'tag_asc':
                    const tagA = a.tags ? a.tags.split(' ')[0].toLowerCase() : 'яяя';
                    const tagB = b.tags ? b.tags.split(' ')[0].toLowerCase() : 'яяя';
                    return tagA.localeCompare(tagB);
                case 'author_asc': return a.author.localeCompare(b.author);
                case 'date_desc': return new Date(b.created_at) - new Date(a.created_at);
                case 'date_asc': return new Date(a.created_at) - new Date(b.created_at);
                default: return 0;
            }
        });
        return processed;
    };

    const processedDocuments = getProcessedDocuments();

    // --- ОПТИМІЗОВАНЕ ВІДКРИТТЯ З КЕШУВАННЯМ ---
    const openDocument = async (filePath, fileName) => {
        try {
            setLoading(true);
            const fileUrl = `${BASE_URL}/${filePath}`;
            const safeFileName = fileName.replace(/\s+/g, '_');
            const fileExt = filePath.split('.').pop().toLowerCase();
            const localUri = `${FileSystem.cacheDirectory}${safeFileName}.${fileExt}`;

            // Перевіряємо, чи є файл уже в кеші
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            let targetUri = localUri;

            if (!fileInfo.exists) {
                // Завантажуємо лише якщо файла немає
                const downloadedFile = await FileSystem.downloadAsync(fileUrl, localUri);
                targetUri = downloadedFile.uri;
            }

            let mimeType = 'application/octet-stream';
            if (fileExt === 'pdf') mimeType = 'application/pdf';
            else if (fileExt === 'doc') mimeType = 'application/msword';
            else if (fileExt === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            setLoading(false);

            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(targetUri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri, flags: 1, type: mimeType,
                });
            } else {
                await Sharing.shareAsync(targetUri, { UTI: mimeType });
            }
        } catch (error) {
            console.error(error); setLoading(false);
            Alert.alert("Помилка", "Не вдалося відкрити файл.");
        }
    };

    // --- МАСОВИЙ ВИБІР ФАЙЛІВ ---
    const pickFiles = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
            if (result.canceled || !result.assets || result.assets.length === 0) return;

            setSelectedFiles(result.assets);
            setUploadAuthor(''); setUploadTags('');
            setUploadModalVisible(true);
        } catch (error) { console.error("Помилка вибору:", error); }
    };

    const confirmBulkUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        try {
            // Відправляємо файли по черзі
            for (const file of selectedFiles) {
                const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                const formData = new FormData();
                formData.append('title', fileNameWithoutExt || 'Без назви');
                formData.append('author', uploadAuthor || 'Невідомий автор');
                if (uploadTags.trim()) formData.append('tags', uploadTags.trim());
                formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' });

                await apiClient.post('/books/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            setUploadModalVisible(false); setSelectedFiles([]); await fetchDocuments();
        } catch (error) {
            Alert.alert("Помилка", "Не вдалося завантажити файли.");
        } finally { setIsUploading(false); }
    };

    const openEditModal = (doc) => {
        setEditingDoc(doc); setEditTitle(doc.title); setEditAuthor(doc.author); setEditTags(doc.tags || '');
        setEditModalVisible(true);
    };

    const confirmEdit = async () => {
        try {
            await apiClient.put(`/books/${editingDoc.id}`, { title: editTitle, author: editAuthor, tags: editTags.trim() || null });
            setEditModalVisible(false); await fetchDocuments();
        } catch (error) { Alert.alert("Помилка", "Не вдалося оновити."); }
    };

    const deleteDocument = (id) => {
        Alert.alert("Видалення", "Ви впевнені?", [
            { text: "Скасувати", style: "cancel" },
            {
                text: "Видалити", style: "destructive", onPress: async () => {
                    try { await apiClient.delete(`/books/${id}`); await fetchDocuments(); }
                    catch (error) { Alert.alert("Помилка", "Не вдалося видалити."); }
                }
            }
        ]);
    };

    // --- ДИНАМІЧНИЙ РЕНДЕР (Список або Сітка) ---
    const renderDocument = ({ item }) => {
        const isList = layoutMode === 'list';
        const isPdf = item.file_path.endsWith('.pdf');
        const hasCover = item.cover_path !== null;

        if (isList) {
            return (
                <View style={styles.docCardList}>
                    <TouchableOpacity style={styles.docInfo} onPress={() => openDocument(item.file_path, item.title)}>
                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.authorText}>{item.author}</Text>
                        {item.tags && <Text style={styles.tagsText}>#{item.tags.split(' ').join(' #')}</Text>}
                    </TouchableOpacity>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}><Ionicons name="pencil" size={20} color="#4CAF50" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteDocument(item.id)} style={styles.iconBtn}><Ionicons name="trash-outline" size={20} color="#F44336" /></TouchableOpacity>
                    </View>
                </View>
            );
        }

        // Рендер для сітки
        return (
            <View style={[styles.docCardGrid, { width: layoutMode === 'grid2' ? '47%' : '31%' }]}>
                <TouchableOpacity style={styles.gridTouch} onPress={() => openDocument(item.file_path, item.title)} onLongPress={() => openEditModal(item)}>
                    {/* Обкладинка або заглушка */}
                    <View style={styles.coverContainer}>
                        {hasCover ? (
                            <Image source={{ uri: `${BASE_URL}/${item.cover_path}` }} style={styles.coverImage} resizeMode="cover" />
                        ) : (
                            <View style={[styles.coverFallback, { backgroundColor: isPdf ? '#ffebee' : '#e3f2fd' }]}>
                                <Ionicons name={isPdf ? 'document-text' : 'document'} size={40} color={isPdf ? '#f44336' : '#2196f3'} />
                                <Text style={styles.extText}>{isPdf ? 'PDF' : 'DOC'}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.gridAuthor} numberOfLines={1}>{item.author}</Text>
                </TouchableOpacity>

                {/* Кнопка видалення у сітці */}
                <TouchableOpacity onPress={() => deleteDocument(item.id)} style={styles.gridDeleteBtn}>
                    <Ionicons name="trash" size={16} color="#F44336" />
                </TouchableOpacity>
            </View>
        );
    };

    // Визначаємо кількість колонок для FlatList
    const numColumns = layoutMode === 'list' ? 1 : (layoutMode === 'grid2' ? 2 : 3);

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2196F3" /></View>;

    return (
        <View style={styles.container}>
            {/* ПАНЕЛЬ КЕРУВАННЯ */}
            <View style={styles.headerControls}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput style={styles.searchInput} placeholder="Пошук..." value={searchQuery} onChangeText={setSearchQuery} />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIconBtn}><Ionicons name="close-circle" size={20} color="#ccc" /></TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setSortModalVisible(true)}>
                    <Ionicons name="filter" size={22} color="#2196F3" />
                </TouchableOpacity>

                {/* Кнопки перемикання розмітки */}
                <View style={styles.layoutToggle}>
                    <TouchableOpacity onPress={() => setLayoutMode('list')} style={styles.layoutBtn}>
                        <Ionicons name="list" size={22} color={layoutMode === 'list' ? '#2196F3' : '#888'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setLayoutMode('grid2')} style={styles.layoutBtn}>
                        <Ionicons name="grid" size={20} color={layoutMode === 'grid2' ? '#2196F3' : '#888'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setLayoutMode('grid3')} style={styles.layoutBtn}>
                        <Ionicons name="apps" size={22} color={layoutMode === 'grid3' ? '#2196F3' : '#888'} />
                    </TouchableOpacity>
                </View>
            </View>

            {processedDocuments.length === 0 ? (
                <Text style={styles.emptyText}>Документів не знайдено.</Text>
            ) : (
                <FlatList
                    key={layoutMode} // Ключ змушує FlatList перерендеритися при зміні колонок
                    data={processedDocuments}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={numColumns}
                    renderItem={renderDocument}
                    contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
                    columnWrapperStyle={layoutMode !== 'list' ? styles.row : null}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={pickFiles}><Text style={styles.fabIcon}>+</Text></TouchableOpacity>

            {/* МОДАЛКА МАСОВОГО ЗАВАНТАЖЕННЯ */}
            <Modal visible={uploadModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Завантаження ({selectedFiles.length} файлів)</Text>
                        <Text style={styles.infoText}>Назви будуть взяті з імен файлів.</Text>
                        <TextInput style={styles.input} placeholder="Спільний автор (джерело)" value={uploadAuthor} onChangeText={setUploadAuthor} />
                        <TextInput style={styles.input} placeholder="Спільні теги (через пробіл)" value={uploadTags} onChangeText={setUploadTags} />
                        <View style={styles.modalButtons}>
                            <Button title="Скасувати" color="#888" onPress={() => setUploadModalVisible(false)} />
                            {isUploading ? <ActivityIndicator color="#2196F3" /> : <Button title="Завантажити" onPress={confirmBulkUpload} />}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Модалки сортування та редагування залишені без змін для економії місця (як у попередньому коді) */}
            <Modal visible={editModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Редагувати</Text>
                        <TextInput style={styles.input} placeholder="Назва документа" value={editTitle} onChangeText={setEditTitle} />
                        <TextInput style={styles.input} placeholder="Автор (джерело)" value={editAuthor} onChangeText={setEditAuthor} />
                        <TextInput style={styles.input} placeholder="Теги (через пробіл)" value={editTags} onChangeText={setEditTags} />
                        <View style={styles.modalButtons}>
                            <Button title="Скасувати" color="#888" onPress={() => setEditModalVisible(false)} />
                            <Button title="Зберегти" onPress={confirmEdit} color="#4CAF50" />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={sortModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Сортувати за:</Text>

                        <TouchableOpacity style={styles.sortOptionBtn} onPress={() => { setSortOption('date_desc'); setSortModalVisible(false); }}>
                            <Text style={[styles.sortOptionText, sortOption === 'date_desc' && styles.activeSort]}>📅 Датою (Спочатку нові)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.sortOptionBtn} onPress={() => { setSortOption('date_asc'); setSortModalVisible(false); }}>
                            <Text style={[styles.sortOptionText, sortOption === 'date_asc' && styles.activeSort]}>📅 Датою (Спочатку старі)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.sortOptionBtn} onPress={() => { setSortOption('title_asc'); setSortModalVisible(false); }}>
                            <Text style={[styles.sortOptionText, sortOption === 'title_asc' && styles.activeSort]}>🔤 Алфавітом (За назвою)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.sortOptionBtn} onPress={() => { setSortOption('tag_asc'); setSortModalVisible(false); }}>
                            <Text style={[styles.sortOptionText, sortOption === 'tag_asc' && styles.activeSort]}>🏷️ Алфавітом (За першим тегом)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.sortOptionBtn} onPress={() => { setSortOption('author_asc'); setSortModalVisible(false); }}>
                            <Text style={[styles.sortOptionText, sortOption === 'author_asc' && styles.activeSort]}>👤 За Автором</Text>
                        </TouchableOpacity>

                        <View style={{ marginTop: 15 }}>
                            <Button title="Закрити" color="#888" onPress={() => setSortModalVisible(false)} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerControls: { flexDirection: 'row', padding: 12, paddingBottom: 4, alignItems: 'center' },
    searchContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', elevation: 2, height: 40 },
    searchIcon: { marginRight: 8 }, searchInput: { flex: 1, fontSize: 14 }, clearIconBtn: { padding: 4 },
    sortBtn: { marginLeft: 8, backgroundColor: '#fff', padding: 8, borderRadius: 8, elevation: 2 },

    layoutToggle: { flexDirection: 'row', marginLeft: 8, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
    layoutBtn: { padding: 8 },

    // Стилі СПИСКУ
    docCardList: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
    docInfo: { flex: 1, paddingRight: 10 },
    actionButtons: { flexDirection: 'row', alignItems: 'center' }, iconBtn: { padding: 6, marginLeft: 2 },

    // Стилі СІТКИ
    row: { justifyContent: 'space-between', marginBottom: 10 },
    docCardGrid: { backgroundColor: '#fff', borderRadius: 8, elevation: 2, overflow: 'hidden', paddingBottom: 6 },
    gridTouch: { flex: 1 },
    coverContainer: { height: 120, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    coverImage: { width: '100%', height: '100%' },
    coverFallback: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
    extText: { marginTop: 4, fontSize: 12, fontWeight: 'bold', color: '#666' },
    gridTitle: { fontSize: 12, fontWeight: 'bold', marginHorizontal: 6, marginTop: 6 },
    gridAuthor: { fontSize: 10, color: '#666', marginHorizontal: 6, marginTop: 2 },
    gridDeleteBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 12 },

    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    authorText: { fontSize: 12, color: '#666', marginBottom: 2 },
    tagsText: { fontSize: 12, color: '#2196F3', fontWeight: '500' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },

    fab: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#2196F3', borderRadius: 30, elevation: 8 },
    fabIcon: { fontSize: 30, color: 'white', fontWeight: 'bold', marginTop: -2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '85%', elevation: 10 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    infoText: { fontSize: 12, color: '#666', marginBottom: 15, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 15, fontSize: 14 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    sortOptionBtn: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    sortOptionText: { fontSize: 16, color: '#333' }, activeSort: { color: '#2196F3', fontWeight: 'bold' }
});