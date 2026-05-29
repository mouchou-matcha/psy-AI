# DOCUMENTATION UI/UX POUR FLUTTERFLOW
Cette documentation décrit en détail l'interface utilisateur (UI), l'expérience utilisateur (UX), les couleurs, la typographie et la logique d'interaction de l'application "Marie". 
Utilisez ces spécifications pour recréer exactement la même application dans FlutterFlow.

## 1. THÈME ET STYLES GLOBAUX (DESIGN SYSTEM)

### Couleurs Principales (Palette)
- **Background Principal :** Slate 950 (Hex: `#020617`) - Un noir bleuté profond.
- **Background Secondaire (Cartes, Modales) :** Slate 900 (`#0f172a`) avec une opacité de 40% à 80% + effet Blur (Backdrop Blur).
- **Couleur d'Accentuation Primaire :** Teal 500 (`#14b8a6`) - Utilisé pour les boutons d'action principale, les états actifs, et le logo.
- **Couleur d'Accentuation Secondaire :** Teal 400 (`#2dd4bf`) - Pour les textes mis en évidence et les survols (hover).
- **Texte Principal :** Slate 100 (`#f1f5f9`) - Blanc cassé pour une lecture agréable sur fond sombre.
- **Texte Secondaire :** Slate 400 (`#94a3b8`) - Gris bleuté pour les sous-titres, dates, descriptions.
- **Couleur d'Erreur / Urgence :** Red 500 (`#ef4444`) - Utilisé pour le bouton d'urgence et les messages d'erreur.
- **Bordures :** Slate 800 (`#1e293b`) ou Teal 500 avec faible opacité (`border-teal-500/30`).

### Typographie
- **Police (Font Family) :** Inter ou Roboto (sans-serif moderne, propre et lisible).
- **Tailles :**
  - Titres Modales/Pages : 24px (text-2xl) à 30px, Font Weight: 500 ou 600.
  - Sous-titres : 14px (text-sm) à 16px, Font Weight: 500, souvent en majuscules avec un espacement entre les lettres (tracking-wider).
  - Corps de texte : 14px (text-sm) à 16px, texte fluide et aéré (leading-relaxed).
  - Petit texte : 12px (text-xs) pour les légendes ou temps restant.

### Effets et Ombres
- **Glassmorphism :** Presque toutes les modales et cartes utilisent un fond semi-transparent (ex: `rgba(15, 23, 42, 0.4)`) avec un filtre de flou d'arrière-plan (Backdrop Blur : 8px ou 12px) et une fine bordure.
- **Glow (Lueur) :** Le bouton principal du micro et le logo ont une lueur (Box Shadow douce) de couleur Teal (`box-shadow: 0 0 20px rgba(20, 184, 166, 0.3)`).
- **Bordures arrondies :** Les boutons et modales utilisent un `Border Radius` de 16px (rounded-2xl) ou de 12px (rounded-xl) - design très doux, style iOS.

---

## 2. STRUCTURE DES PAGES (WIDGET TREE FLUTTERFLOW)

### A. Écran de Connexion (Landing Page)
- **Layout :** Stack. En fond, un container `Slate 950` plein écran avec des reflets radiaux colorés floutés animés en CSS (billes translucides).
- **Contenu Centré (Column alignée au centre) :**
  - Titre principal : Text "Marie" (36px, Slate-100, SemiBold).
  - Sous-titre : Text "VOTRE ESPACE DE THÉRAPIE VOCALE" (12px, Teal-500, uppercase, espacé).
  - Liste d'avantages : 3 Rows animées (fade-in) avec icône (Micro, Sparkles, Shield) + Texte explicatif.
  - Bouton Google : Container blanc avec logo Google + "Continuer avec Google".

### B. Écran Principal de l'Application (Console Vocale)
- **Layout Global :** SafeArea avec une colonne principale prenant toute la hauteur (MainAxisAlignment.spaceBetween).
- **Top Bar (Row) :**
  - Gauche : Bouton "Temps restant" (`Container` arrondi avec icône Horloge + texte "05:00 min"). Au clic -> ouvre un panel d'achat (Bottom Sheet / Modal).
  - Droite : Deux icônes cliquables (IconButton). Une pour les "Paramètres" (Roue crantée) et une pour "Déconnexion" (Flèche de sortie).
- **Centre (Column centrée) :**
  - Widget personnalisé : Logo "MindHeart" en SVG (représentation d'un cœur et cerveau fusionnés qui pulse). Dans FlutterFlow, utilisez un composant Lottie ou une image SVG avec composant Animation.
  - Widget Visualiseur Audio : Des barres verticales (ondes sonores) qui bougent lorsque l'utilisateur ou l'IA parle. (Dans FlutterFlow, vous pouvez utiliser un Lottie par défaut d'onde sonore qui s'active en fonction de l'état).
  - Status Text : "Marie vous écoute..." ou "Configuration du flux..." selon l'état de connexion de l'API.
- **Bottom Bar (Zone d'Action - Stack/Row) :**
  - Bouton principal au centre : Gros bouton circulaire (FloatingActionButton / Container rond 80x80) avec icône Microphone.
    - État Off : Gris/Teal très sombre, icône transparente.
    - État Actif (Enregistrement) : Remplissage Rouge, icône de stop/pause, effet de lueur pulsante.
  - Boutons secondaires autour du bouton central :
    - Gauche : Bouton "Historique" (icône Liste/Dossier).
    - Droite : Bouton "Mode Incisif" (icône Éclair, toggle On/Off) et Bouton "Urgence" (icône Triangle rouge).

### C. Modales & Popups (Composants Dialog / Bottom Sheet)

**1. Modales Paramètres (Settings)**
- **Type :** AlertDialog ou Bottom Sheet centrée. Fond Glassmorphism.
- **Contenu :**
  - Sélection de langue (Row avec 4 boutons carrés [40x40], images des drapeaux de la France, UK, Allemagne, Espagne). Le bouton actif a une bordure Teal 500 et un léger "scale/zoom".
  - Sélection de voix (Dropdown / Sélecteur avec Zephyr, Kore, etc.) et un bouton "Play" pour prévisualiser.
  - Boutons d'export (Télécharger données JSON) et bouton RGPD Politique de vie privée.

**2. Modale "Temps Écoulé" (Paywall)**
- **Déclencheur :** Quand le minuteur global tombe à 00:00 (Fin des 5 min).
- **UX :** L'utilisateur NE PEUT PAS quitter cette popup sans recharger (ou fermer la session).
- **Design :**
  - Icône Horloge au centre.
  - Titre : "Temps écoulé".
  - Cartes de prix (Column de Rows). Ex: "Forfait 1 heure - 20€" (Carte mise en avant avec bordure Teal), "Forfait 30 minutes - 10€".
  - Au clic sur un de ces forfaits : Lance une Action URL (Stripe Checkout). Une fois que Firebase se met à jour, la modale disparait et la séance reprend.
  
**3. Modale Historique des Séances (Drawer ou Dialog Large)**
- **Layout :** Panneau latéral droit ou grande modale plein écran scrollable.
- **Contenu :**
  - Titre "Historique de vos séances".
  - ListView (Liste des séances passées, triées par date décroissante).
  - **Item de liste (Accordion / Expandable) :** 
    - Header de l'item : Date formatée + Résumé très court généré par une IA.
    - Contenu déroulé : Texte riche détaillant les "Insights" (pistes de réflexion), le "Therapeutic plan" (Plan d'action), et les "Clinical Data" (Schémas cognitifs).
    - Bouton supprimer (icône poubelle rouge) pour effacer la séance.

---

## 3. LOGIQUE D'ÉTAT (APP STATE & FIREBASE)
Pour que FlutterFlow reproduise ce comportement :

- **Base de données Firebase :**
  - Collection `users` : Document `uid` avec champ `availableTime` (Integer, secondes, ex: `300` pour 5 min).
  - Collection `patient_history` : Enregistrement de chaque fin de séance (id, userId, date, summary, insights, etc.).
- **Minuteur Global (Periodic Action / Timer Widget) :**
  - Un timer décrémente `availableTime` toutes les secondes LORSQUE la séance vocale (isConnected) est active. 
  - Si timer <= 0, déclenche `Action: Pause Session` et `Action: Show Bottom Sheet (Paywall)`.
- **WebSocket / Live Audio :** L'interface repose sur Gemini Live API. Dans FlutterFlow, cela nécessitera probablement un composant personnalisé (Custom Widget ou Custom Action en Dart) pour gérer le straming audio entrant et sortant via WebSocket.

## 4. ANIMATIONS À INTÉGRER DANS FLUTTERFLOW
- **Animation de démarrage (On Page Load) :** Apparition progressive (Fade / Slide Up) des éléments de la page de login et de l'interface principale. Offset Y: 20px, Duration: 500ms.
- **Écran d'attente vocal :** Lorsque l'utilisateur parle, l'opacité et l'échelle (scale) de l'audio-visualiseur changent en boucle.
- **Transition bouton micro :** Le passage de Mic-Off à Mic-On modifie la taille du bouton de 1.1x et change la couleur en ~300ms de manière fluide.
