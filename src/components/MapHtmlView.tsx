import { View, type ViewStyle, type StyleProp } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type Props = {
  html: string;
  onMessage: (data: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function MapHtmlView({ html, onMessage, style }: Props) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <WebView
        source={{ html, baseUrl: 'https://localhost' }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        onMessage={(e: WebViewMessageEvent) => onMessage(e.nativeEvent.data)}
        scrollEnabled={false}
        webviewDebuggingEnabled
      />
    </View>
  );
}
