import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

// 定義卡片接收的資料格式
type CardProps = {
    item: {
        id: number | string;
        name: string;
        image: string;
        age: number;
        bio: string;
    };
    };

    const { width, height } = Dimensions.get('window');

    const Card = ({ item }: CardProps) => {
    return (
        <View style={styles.card}>
        {/* 背景圖片 */}
        <Image source={{ uri: item.image }} style={styles.image} />
        
        {/* 下方的文字資訊區塊 */}
        <View style={styles.textContainer}>
            <View style={styles.header}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.age}>{item.age}</Text>
            </View>
            <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        </View>
        </View>
    );
    };

    const styles = StyleSheet.create({
    card: {
        width: width * 0.9,     // 卡片寬度佔螢幕 90%
        height: height * 0.7,   // 卡片高度佔螢幕 70%
        borderRadius: 20,       // 圓角
        backgroundColor: 'white',
        shadowColor: "#000",    // 陰影 (iOS)
        shadowOffset: {
        width: 0,
        height: 5,
        },
        shadowOpacity: 0.36,
        shadowRadius: 6.68,
        elevation: 11,          // 陰影 (Android)
        position: 'relative',
        overflow: 'hidden',     // 讓圖片不會超出圓角
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    textContainer: {
        position: 'absolute',   // 浮在圖片上面
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        // 做一個漸層黑底，讓字比較明顯
        backgroundColor: 'rgba(0,0,0,0.5)', 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 5,
    },
    name: {
        fontSize: 30,
        fontWeight: 'bold',
        color: 'white',
        marginRight: 10,
    },
    age: {
        fontSize: 24,
        color: 'white',
    },
    bio: {
        fontSize: 16,
        color: '#ddd',
        lineHeight: 22,
    },
});

export default Card;