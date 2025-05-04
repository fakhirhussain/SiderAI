import sys
import json
import requests
import os
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                              QHBoxLayout, QTextEdit, QLineEdit, QPushButton, 
                              QLabel, QSystemTrayIcon, QMenu, QComboBox,
                              QScrollArea, QFrame, QSizePolicy, QGraphicsDropShadowEffect, QFileDialog, QHBoxLayout, QVBoxLayout, QLabel)
from PySide6.QtCore import Qt, QSize, QPoint, QPropertyAnimation, QEasingCurve, QRect, QTimer, Property, QThread, Signal
from PySide6.QtGui import (QIcon, QAction, QFont, QColor, QPalette, QPixmap, QCursor, 
                          QLinearGradient, QBrush, QPainter, QPainterPath, QFontDatabase)

# Load custom fonts
def load_fonts():
    # You can download and use these fonts or replace with system fonts
    # QFontDatabase.addApplicationFont("fonts/Poppins-Regular.ttf")
    # QFontDatabase.addApplicationFont("fonts/Poppins-Bold.ttf")
    # QFontDatabase.addApplicationFont("fonts/Poppins-Medium.ttf")
    pass

class APIWorker(QThread):
    finished = Signal(str, str)  # Signal to emit when API call is done (response, error)
    
    def __init__(self, api_key, message, model):
        super().__init__()
        self.api_key = api_key
        self.message = message
        self.model = model
        
    def run(self):
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": self.message}],
                },
                timeout=30  # Add timeout to prevent hanging
            )
            
            if not response.ok:
                self.finished.emit("", f"API Error: {response.status_code} - {response.text}")
                return
                
            data = response.json()
            self.finished.emit(data["choices"][0]["message"]["content"], "")
            
        except Exception as e:
            self.finished.emit("", f"Error: {str(e)}")
            
class PulseAnimation(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(40, 10)
        
        # Animation properties
        self._opacity = 1.0
        self.animation_timer = QTimer(self)
        self.animation_timer.timeout.connect(self.update_animation)
        self.animation_timer.start(400)
        
        # Dot positions
        self.dot_positions = [10, 20, 30]
        self.dot_states = [0, 1, 2]  # Different states for animation offset
        
    def update_animation(self):
        # Cycle through states
        self.dot_states = [(state + 1) % 3 for state in self.dot_states]
        self.update()
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        for i, pos in enumerate(self.dot_positions):
            # Calculate opacity based on state
            opacity = 0.4 + (0.6 * (self.dot_states[i] / 2))
            
            painter.setBrush(QBrush(QColor(100, 100, 100, int(255 * opacity))))
            painter.setPen(Qt.NoPen)
            
            # Draw dot with varying opacity
            painter.drawEllipse(pos - 3, 4 - self.dot_states[i], 6, 6)

class MessageBubble(QFrame):
    def __init__(self, message, is_user=True, attachments=None, parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.NoFrame)
        self.is_user = is_user
        
        if is_user:
            self.setStyleSheet("""
                QFrame {
                    background-color: #6366F1;
                    border-radius: 20px;
                    border-top-right-radius: 4px;
                }
            """)
        else:
            self.setStyleSheet("""
                QFrame {
                    background-color: #F3F4F6;
                    border-radius: 20px;
                    border-top-left-radius: 4px;
                }
            """)
        
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 30))
        shadow.setOffset(0, 2)
        self.setGraphicsEffect(shadow)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(6)
        
        msg_label = QLabel(message)
        msg_label.setWordWrap(True)
        msg_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        font = QFont("Segoe UI", 10)
        font.setStyleStrategy(QFont.PreferAntialias)
        msg_label.setFont(font)
        
        if is_user:
            msg_label.setStyleSheet("color: white; font-weight: 400;")
        else:
            msg_label.setStyleSheet("color: #111827; font-weight: 400;")
        
        msg_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Minimum)
        msg_label.setMinimumWidth(200)
        layout.addWidget(msg_label)
        
        # Handle attachments properly
        if attachments and isinstance(attachments, (list, tuple)):  # Check if it's iterable
            attachments_layout = QVBoxLayout()
            attachments_layout.setContentsMargins(0, 10, 0, 0)
            attachments_layout.setSpacing(5)
            
            for file_path in attachments:
                if isinstance(file_path, str):  # Ensure it's a file path string
                    attachment_widget = AttachmentWidget(file_path)
                    attachments_layout.addWidget(attachment_widget)
            
            layout.addLayout(attachments_layout)
        
        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Minimum)
        self.setMaximumWidth(int(parent.width() * 0.7) if parent else 400)

class FloatingButton(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent, Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool)

        # Set size
        self.setFixedSize(60, 60)

        # 🛠 Make the widget background transparent
        self.setAttribute(Qt.WA_TranslucentBackground)

        # Set circular background gradient
        self.gradient = QLinearGradient(0, 0, 60, 60)
        self.gradient.setColorAt(0, QColor("#6366F1"))  # Indigo
        self.gradient.setColorAt(1, QColor("#8B5CF6"))  # Purple

        # Add icon label
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        self.icon_label = QLabel()
        self.icon_label.setAlignment(Qt.AlignCenter)
        self.icon_label.setText("🧠")
        self.icon_label.setFont(QFont("Segoe UI", 24))
        self.icon_label.setStyleSheet("color: white; background: transparent; border: none;")
        layout.addWidget(self.icon_label)

        # For dragging
        self.dragging = False
        self.offset = None

        # Store position for persistence
        self.saved_position = None

        # Track mouse movement to detect drags vs clicks
        self.drag_distance = 0
        self.press_pos = None

        # Add shadow effect
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(20)
        shadow.setColor(QColor(0, 0, 0, 80))
        shadow.setOffset(0, 4)
        self.setGraphicsEffect(shadow)

        # Hover animation
        self._hover_scale = 1.0
        self.setMouseTracking(True)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        # Scale for hover effect
        if self._hover_scale > 1.0:
            painter.translate(self.width() / 2, self.height() / 2)
            painter.scale(self._hover_scale, self._hover_scale)
            painter.translate(-self.width() / 2, -self.height() / 2)

        # Paint the circular gradient
        painter.setBrush(QBrush(self.gradient))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(0, 0, self.width(), self.height())

    def enterEvent(self, event):
        self.anim = QPropertyAnimation(self, b"hover_scale")
        self.anim.setDuration(150)
        self.anim.setStartValue(1.0)
        self.anim.setEndValue(1.08)
        self.anim.setEasingCurve(QEasingCurve.OutCubic)
        self.anim.start()

    def leaveEvent(self, event):
        self.anim = QPropertyAnimation(self, b"hover_scale")
        self.anim.setDuration(150)
        self.anim.setStartValue(self._hover_scale)
        self.anim.setEndValue(1.0)
        self.anim.setEasingCurve(QEasingCurve.OutCubic)
        self.anim.start()

    def get_hover_scale(self):
        return self._hover_scale

    def set_hover_scale(self, scale):
        self._hover_scale = scale
        self.update()

    hover_scale = Property(float, get_hover_scale, set_hover_scale)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = True
            self.offset = event.pos()
            self.press_pos = event.pos()
            self.drag_distance = 0

    def mouseMoveEvent(self, event):
        if self.dragging and event.buttons() == Qt.LeftButton:
            if self.press_pos:
                delta = event.pos() - self.press_pos
                self.drag_distance += delta.manhattanLength()

            new_pos = self.mapToGlobal(event.pos() - self.offset)
            self.move(new_pos)
            self.saved_position = new_pos

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            was_dragging = self.dragging
            self.dragging = False

            if was_dragging and self.drag_distance < 5:
                self.clicked()

    def clicked(self):
        pass

class TypingIndicator(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.NoFrame)
        self.setStyleSheet("""
            QFrame {
                background-color: #F3F4F6;
                border-radius: 20px;
                border-top-left-radius: 4px;
            }
        """)
        
        # Add shadow effect
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 30))
        shadow.setOffset(0, 2)
        self.setGraphicsEffect(shadow)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        
        # Add typing animation
        self.typing_animation = PulseAnimation()
        layout.addWidget(self.typing_animation)

class RoundedComboBox(QComboBox):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # Set the style
        self.setStyleSheet("""
            QComboBox {
                background-color: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 20px;
                padding: 5px 15px;
                color: white;
                font-size: 12px;
                font-weight: 500;
                min-height: 36px;
            }
            QComboBox::drop-down {
                subcontrol-origin: padding;
                subcontrol-position: right;
                width: 20px;
                border-left-width: 0px;
            }
            QComboBox::down-arrow {
                image: url(none);
                width: 0;
            }
            QComboBox QAbstractItemView {
                background-color: white;
                color: #333;
                border-radius: 10px;
                border: 1px solid #E5E7EB;
                selection-background-color: #6366F1;
                selection-color: white;
                padding: 5px;
            }
        """)

class ModernButton(QPushButton):
    def __init__(self, text="", parent=None):
        super().__init__(text, parent)
        self.setStyleSheet("""
            QPushButton {
                background-color: #6366F1;
                color: white;
                border-radius: 20px;
                font-weight: 500;
                font-size: 14px;
                padding: 10px 20px;
                border: none;
            }
            QPushButton:hover {
                background-color: #4F46E5;
            }
            QPushButton:pressed {
                background-color: #4338CA;
            }
        """)
        
        # Add shadow effect
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 60))
        shadow.setOffset(0, 4)
        self.setGraphicsEffect(shadow)

class IconButton(QPushButton):
    def __init__(self, text="", parent=None):
        super().__init__(text, parent)
        self.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: white;
                font-size: 16px;
                border: none;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
            }
        """)

class ModernLineEdit(QLineEdit):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QLineEdit {
                border: 1px solid #E5E7EB;
                border-radius: 20px;
                font-family: 'Segoe UI';
                font-size: 14px;
                padding: 10px 15px;
                background-color: #F9FAFB;
            }
            QLineEdit:focus {
                border: 1px solid #6366F1;
                background-color: white;
            }
        """)
        
        # Add shadow effect
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(10)
        shadow.setColor(QColor(0, 0, 0, 20))
        shadow.setOffset(0, 2)
        self.setGraphicsEffect(shadow)

class BrandLogosWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(40)
        self.setStyleSheet("background-color: transparent; border: none;")

        # Create layout
        self.layout = QHBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(5)
        self.layout.setAlignment(Qt.AlignCenter)

        # Add "Sponsored by:" label
        self.sponsor_label = QLabel("Sponsored by:")
        self.sponsor_label.setFont(QFont("Segoe UI", 10, QFont.Bold))
        self.sponsor_label.setStyleSheet("""
            color: #6B7280;
            margin: 0px;
            padding: 0px;
            border: none;
            background: transparent;
        """)
        self.layout.addWidget(self.sponsor_label)

        # Add brand logos with correct paths
        self.add_brand_logo("Nike", os.path.join("logos", "nike.png"))
        self.add_brand_logo("Dominos", os.path.join("logos", "dominos.png"))
        self.add_brand_logo("Hardee's", os.path.join("logos", "hardees.png"))

    def add_brand_logo(self, name, image_path):
        label = QLabel()
        
        # Check if file exists
        if not os.path.exists(image_path):
            print(f"Warning: Logo not found at {image_path}")
            return
            
        pixmap = QPixmap(image_path)
        if pixmap.isNull():
            print(f"Warning: Could not load logo from {image_path}")
            return
            
        label.setPixmap(pixmap.scaled(75, 50, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        label.setStyleSheet("""
            color: #6B7280;
            margin: 0px;
            padding: 0px;
            border: none;
            background: white;
        """)
        label.setAlignment(Qt.AlignCenter)
        label.setToolTip(name)
        self.layout.addWidget(label)

class AttachmentWidget(QWidget):
    def __init__(self, file_path, parent=None):
        super().__init__(parent)
        self.file_path = file_path
        self.setup_ui()

    def setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 5, 0, 5)
        
        # Display thumbnail for images
        if self.file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            pixmap = QPixmap(self.file_path)
            if not pixmap.isNull():
                thumbnail = pixmap.scaled(100, 100, Qt.KeepAspectRatio)
                img_label = QLabel()
                img_label.setPixmap(thumbnail)
                layout.addWidget(img_label)
        
        # Show filename
        file_label = QLabel(os.path.basename(self.file_path))
        file_label.setStyleSheet("color: #666; font-size: 12px;")
        layout.addWidget(file_label, 1)
        
        # Remove button
        remove_btn = QPushButton("×")
        remove_btn.setStyleSheet("""
            QPushButton {
                color: #f44336;
                font-size: 14px;
                border: none;
                background: transparent;
            }
            QPushButton:hover {
                color: #d32f2f;
            }
        """)
        remove_btn.setFixedSize(20, 20)
        remove_btn.clicked.connect(self.deleteLater)
        layout.addWidget(remove_btn)
        
class ChatWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        # Load custom fonts
        load_fonts()
        
        # Store window geometry for restore after minimizing
        self.normal_geometry = None
        # Track the last message widget for scrolling
        self.last_message_widget = None
        # Window setup
        self.setWindowTitle("SiderAI Interface")
        self.setMinimumSize(400, 600)
        self.setWindowFlags(Qt.FramelessWindowHint)
        
        # Set rounded corners and border for the window
        self.setStyleSheet("""
            QMainWindow {
                background-color: white;
                border-radius: 12px;
                border: 1px solid #E5E7EB;
            }
        """)
        
        # Main widget and layout
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout(self.central_widget)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)
        self.last_user_message = None  # Track last user message widget
        # Create floating button
        self.floating_button = FloatingButton()
        self.floating_button.hide()
        # Override the clicked method
        self.floating_button.clicked = self.restore_from_floating
        
        # Title bar with gradient
        self.title_bar = QWidget()
        self.title_bar_layout = QHBoxLayout(self.title_bar)
        self.title_bar_layout.setContentsMargins(20, 15, 20, 15)
        self.title_bar.setFixedHeight(70)
        self.title_bar.setStyleSheet("""
            QWidget {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #6366F1, stop:1 #8B5CF6);
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
            }
        """)
        
        # App title
        self.title_label = QLabel("SiderAI")
        self.title_label.setFont(QFont("Segoe UI", 18, QFont.Bold))
        self.title_label.setStyleSheet("color: white;")
        self.title_bar_layout.addWidget(self.title_label)
        
        # Subtitle
        self.subtitle_label = QLabel("AI Assistant")
        self.subtitle_label.setFont(QFont("Segoe UI", 10))
        self.subtitle_label.setStyleSheet("color: rgba(255, 255, 255, 0.8);")
        self.title_bar_layout.addWidget(self.subtitle_label)
        
        self.title_bar_layout.addStretch()
        
        # Model selector with dropdown style
        self.model_selector = RoundedComboBox()
        self.model_selector.addItems([
            "gemma2-9b-it",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "llama3-8b-8192",
        ])
        self.model_selector.setCurrentText("gemma2-9b-it")
        self.model_selector.setFixedWidth(200)
        self.title_bar_layout.addWidget(self.model_selector)
        
        # Settings button
        self.settings_button = IconButton("⚙")
        self.settings_button.setFixedSize(36, 36)
        self.title_bar_layout.addWidget(self.settings_button)
        
        # Minimize button
        self.minimize_button = IconButton("—")
        self.minimize_button.setFixedSize(36, 36)
        self.minimize_button.clicked.connect(self.minimize_to_floating)
        self.title_bar_layout.addWidget(self.minimize_button)
        
        # Maximize button
        self.maximize_button = IconButton("□")
        self.maximize_button.setFixedSize(36, 36)
        self.maximize_button.clicked.connect(self.toggle_maximize)
        self.title_bar_layout.addWidget(self.maximize_button)
        
        # Close button
        self.close_button = IconButton("×")
        self.close_button.setFixedSize(36, 36)
        self.close_button.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: white;
                font-size: 20px;
                border: none;
            }
            QPushButton:hover {
                background-color: rgba(239, 68, 68, 0.8);
                border-radius: 18px;
            }
        """)
        self.close_button.clicked.connect(self.close)
        self.title_bar_layout.addWidget(self.close_button)
        
        self.layout.addWidget(self.title_bar)
        
        # Brand logos widget
        self.brand_logos = BrandLogosWidget()
        self.layout.addWidget(self.brand_logos)
        
        # Chat display area with scroll
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: white;
            }
            QScrollBar:vertical {
                border: none;
                background: transparent;
                width: 8px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                background: #D1D5DB;
                min-height: 20px;
                border-radius: 4px;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                border: none;
                background: none;
                height: 0px;
            }
        """)
        
        self.chat_container = QWidget()
        self.chat_container.setStyleSheet("background-color: white;")
        self.chat_layout = QVBoxLayout(self.chat_container)
        self.chat_layout.setAlignment(Qt.AlignTop)
        self.chat_layout.setContentsMargins(20, 20, 20, 20)
        self.chat_layout.setSpacing(16)
        
        self.scroll_area.setWidget(self.chat_container)
        self.layout.addWidget(self.scroll_area)
                
        # Input area
        self.input_widget = QWidget()
        self.input_widget.setStyleSheet("""
            QWidget {
                background-color: white;
                padding: 10px;
                border-top: 1px solid #E5E7EB;
                border-bottom-left-radius: 12px;
                border-bottom-right-radius: 12px;
            }
        """)
        self.input_layout = QHBoxLayout(self.input_widget)
        self.input_layout.setContentsMargins(20, 15, 20, 15)
        
        self.message_input = ModernLineEdit()
        self.message_input.setPlaceholderText("Type your message here...")
        self.message_input.setFixedHeight(44)
        self.message_input.returnPressed.connect(self.send_message)
        self.input_layout.addWidget(self.message_input)
        
        self.send_button = QPushButton()
        self.send_button.setFixedSize(44, 44)
        self.send_button.setStyleSheet("""
            QPushButton {
                background-color: #6366F1;
                color: white;
                border-radius: 22px;
                font-weight: bold;
                font-size: 18px;
            }
            QPushButton:hover {
                background-color: #4F46E5;
            }
            QPushButton:pressed {
                background-color: #4338CA;
            }
        """)
        self.send_button.setText("➤")
        self.send_button.clicked.connect(self.send_message)
        
        # Add shadow to send button
        shadow = QGraphicsDropShadowEffect(self.send_button)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 60))
        shadow.setOffset(0, 4)
        self.send_button.setGraphicsEffect(shadow)
        
        self.input_layout.addWidget(self.send_button)
        
        self.layout.addWidget(self.input_widget)
        
        # System tray icon
        self.tray_icon = QSystemTrayIcon(self)
        self.tray_icon.setIcon(QIcon.fromTheme("chat"))
        self.attachment_btn = QPushButton()
        self.attachment_btn.setIcon(QIcon.fromTheme("mail-attachment"))
        self.attachment_btn.setFixedSize(44, 44)
        self.attachment_btn.setStyleSheet("""
            QPushButton {
                background-color: #E0E0E0;
                border-radius: 22px;
            }
            QPushButton:hover {
                background-color: #BDBDBD;
            }
        """)
        
        # Track attachments
        self.current_attachments = []
        tray_menu = QMenu()
        show_action = QAction("Show", self)
        show_action.triggered.connect(self.restore_from_tray)
        tray_menu.addAction(show_action)
        
        exit_action = QAction("Exit", self)
        exit_action.triggered.connect(app.quit)
        tray_menu.addAction(exit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self.tray_icon_activated)
        self.tray_icon.show()
        
        # For window dragging
        self.dragging = False
        self.offset = None
        self.is_maximized = False
        
        # API key - in a real app, this should be securely stored
        self.api_key = "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" # Add your Groq API key here
        
        # Add welcome message
        self.add_message("Welcome to SiderAI! I'm your AI assistant powered by Groq. How can I help you today?", False)
        
        # Add window shadow
        window_shadow = QGraphicsDropShadowEffect(self)
        window_shadow.setBlurRadius(20)
        window_shadow.setColor(QColor(0, 0, 0, 80))
        window_shadow.setOffset(0, 4)
        self.setGraphicsEffect(window_shadow)
        
        # Create logos directory if it doesn't exist
        if not os.path.exists("logos"):
            os.makedirs("logos")
    def add_attachment(self):
        file_dialog = QFileDialog()
        file_dialog.setFileMode(QFileDialog.ExistingFiles)
        file_dialog.setNameFilter("Images (*.png *.jpg *.jpeg);;All Files (*)")
        
        if file_dialog.exec():
            selected_files = file_dialog.selectedFiles()
            for file_path in selected_files:
                self.current_attachments.append(file_path)
                self.show_attachment_preview(file_path)

    def show_attachment_preview(self, file_path):
        # Show thumbnail above input area
        preview = AttachmentWidget(file_path)
        self.chat_layout.addWidget(preview)
        self.scroll_to_bottom()

    def clear_attachments(self):
        self.current_attachments = []    
    
    def resizeEvent(self, event):
            """Handle resize events to update message bubble max width"""
            super().resizeEvent(event)
            
            # Update all message bubbles' maximum width
            for i in range(self.chat_layout.count()):
                item = self.chat_layout.itemAt(i)
                if item and item.widget() and isinstance(item.widget(), MessageBubble):
                    # Set max width to 70% of the chat container width
                    item.widget().setMaximumWidth(int(self.chat_container.width() * 0.7))
            
            # Scroll to bottom after resize
            QTimer.singleShot(100, lambda: self.scroll_area.verticalScrollBar().setValue(
                self.scroll_area.verticalScrollBar().maximum()
            ))
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton and self.title_bar.geometry().contains(event.pos()):
            self.dragging = True
            self.offset = event.pos()
    
    def mouseMoveEvent(self, event):
        if self.dragging and event.buttons() == Qt.LeftButton:
            self.move(self.mapToGlobal(event.pos() - self.offset))
    
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = False
    
    def toggle_maximize(self):
        if self.is_maximized:
            self.showNormal()
            self.is_maximized = False
            self.maximize_button.setText("□")
        else:
            self.showMaximized()
            self.is_maximized = True
            self.maximize_button.setText("❐")
    
    def minimize_to_floating(self):
        # Store current geometry to restore later
        self.normal_geometry = self.geometry()
        
        # Show floating button
        self.showFloatingIcon()
    
    def restore_from_floating(self):
        """Restore main window when floating button is clicked"""
        self.floating_button.hide()
        
        # Restore window to previous position
        if self.normal_geometry:
            self.setGeometry(self.normal_geometry)
        
        self.show()
        self.activateWindow()  # Bring window to front
    
    def restore_from_tray(self):
        """Restore window from tray icon click"""
        self.floating_button.hide()
        
        # Restore window to previous position
        if self.normal_geometry:
            self.setGeometry(self.normal_geometry)
        
        self.show()
        self.activateWindow()  # Bring window to front
    
    def showFloatingIcon(self):
        # Hide main window
        self.hide()
        
        # Position floating button near cursor or at its last position
        if self.floating_button.saved_position:
            self.floating_button.move(self.floating_button.saved_position)
        else:
            # First time position near cursor
            cursor_pos = QCursor.pos()
            self 
            # First time position near cursor
            cursor_pos = QCursor.pos()
            self.floating_button.move(cursor_pos.x() - 30, cursor_pos.y() - 30)
            self.floating_button.saved_position = self.floating_button.pos()
            
        self.floating_button.show()
    
    def tray_icon_activated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            if self.isHidden():
                self.restore_from_tray()
            else:
                # Store current position before minimizing
                self.normal_geometry = self.geometry()
                self.minimize_to_floating()
    
    def closeEvent(self, event):
        self.floating_button.close()
        event.accept()  # Actually close the app
    
    def add_message(self, message, is_user=True, attachments=None):
        """Add a message bubble to the chat"""
        if attachments is None:
            attachments = []
        
        bubble = MessageBubble(message, is_user, attachments, self.chat_container)
        
        if is_user:
            self.chat_layout.addWidget(bubble, alignment=Qt.AlignRight)
        else:
            self.chat_layout.addWidget(bubble, alignment=Qt.AlignLeft)
        
        bubble.setMaximumWidth(int(self.chat_container.width() * 0.7))
        self.last_message_widget = bubble  # Update the last message reference
        
        # Scroll to show the new message
        self.scroll_to_message(bubble)

    def scroll_to_bottom(self):
        """Scrolls to the absolute bottom of the chat"""
        scroll_bar = self.scroll_area.verticalScrollBar()
        scroll_bar.setValue(scroll_bar.maximum())
        QTimer.singleShot(10, lambda: scroll_bar.setValue(scroll_bar.maximum()))
        QTimer.singleShot(50, lambda: scroll_bar.setValue(scroll_bar.maximum()))

    def scroll_to_message(self, message_widget):
        """Scrolls to make the specified message widget visible"""
        if not message_widget:
            return
            
        def do_scroll():
            scroll_area = self.scroll_area
            scroll_bar = scroll_area.verticalScrollBar()
            
            # Calculate the position to scroll to
            widget_pos = message_widget.pos()
            widget_height = message_widget.height()
            viewport_height = scroll_area.viewport().height()
            
            # Center the message in the viewport
            scroll_pos = widget_pos.y() - (viewport_height - widget_height) // 2
            scroll_pos = max(0, min(scroll_pos, scroll_bar.maximum()))
            
            # Animate the scroll for smooth movement
            animation = QPropertyAnimation(scroll_bar, b"value")
            animation.setDuration(300)
            animation.setEasingCurve(QEasingCurve.OutCubic)
            animation.setStartValue(scroll_bar.value())
            animation.setEndValue(scroll_pos)
            animation.start()
        
        QTimer.singleShot(50, do_scroll)

    def send_message(self):
        message = self.message_input.text().strip()
        
        # Don't send empty messages without attachments
        if not message and not self.current_attachments:
            return
        
        selected_model = self.model_selector.currentText()
        
        if not self.api_key:
            self.add_message("Please set your Groq API key in the code first.", False)
            return
        
        # Add user message with attachments
        self.add_message(message, is_user=True, attachments=self.current_attachments)
        
        # Process attachments if any
        if self.current_attachments:
            self.process_attachments(self.current_attachments)
        
        # Clear input and attachments
        self.message_input.clear()
        self.clear_attachments()
        
        # Show typing indicator
        self.typing_indicator = TypingIndicator(self.chat_container)
        self.chat_layout.addWidget(self.typing_indicator, alignment=Qt.AlignLeft)
        self.typing_indicator.setMaximumWidth(int(self.chat_container.width() * 0.7))
        
        # Scroll to keep the last message visible
        self.scroll_to_message(self.last_message_widget)
        
        QApplication.processEvents()
        
        # Start API call in a separate thread
        self.api_worker = APIWorker(self.api_key, message, selected_model)
        self.api_worker.finished.connect(self.handle_api_response)
        self.api_worker.start()
        
        # Disable send button while processing
        self.send_button.setEnabled(False)
        self.message_input.setEnabled(False)

    def handle_api_response(self, response, error):
        # Remove typing indicator
        if hasattr(self, 'typing_indicator'):
            self.typing_indicator.setParent(None)
            self.typing_indicator.deleteLater()
        
        # Re-enable input
        self.send_button.setEnabled(True)
        self.message_input.setEnabled(True)
        
        if error:
            self.add_message(error, False)
        else:
            self.add_message(response, False)
        
        # Scroll to keep the conversation visible
        self.scroll_to_message(self.last_message_widget)
        
    def process_attachments(self, attachments):
        for file_path in attachments:
            try:
                # Example for API upload (adjust for your needs)
                with open(file_path, 'rb') as f:
                    files = {'file': (os.path.basename(file_path), f)}
                    response = requests.post(
                        "https://your-api.com/upload",
                        files=files,
                        headers={"Authorization": f"Bearer {self.api_key}"}
                    )
                    # Handle response...
            except Exception as e:
                print(f"Error uploading {file_path}: {str(e)}")
    def process_response(self, message, selected_model, typing_indicator):
        try:
            response = self.call_groq_api(message, selected_model)
            typing_indicator.setParent(None)
            typing_indicator.deleteLater()
            self.add_message(response, False)
            
            # Show both question and answer
            if hasattr(self, 'last_user_message') and self.last_user_message:
                self.scroll_to_message(self.last_user_message)
                
        except Exception as e:
            typing_indicator.setParent(None)
            typing_indicator.deleteLater()
            self.add_message(f"Error: {str(e)}", False)
            
            if hasattr(self, 'last_user_message') and self.last_user_message:
                self.scroll_to_message(self.last_user_message)
    
    def call_groq_api(self, message, model):
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": message}],
            },
        )
        
        if not response.ok:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ChatWindow()
    window.show()
    sys.exit(app.exec())
