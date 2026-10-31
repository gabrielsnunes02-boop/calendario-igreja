import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import './styles.css';
import { nav } from './nav';
import { homeScreen } from './screens/home';

// Evita o menu de "copiar imagem" e o zoom da página durante o desenho
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

nav.reset(homeScreen);
