import json
import os
from PyQt5.QtWidgets import ( QApplication,
    QWidget, QLabel, QLineEdit, QPushButton, QVBoxLayout, QHBoxLayout,
    QComboBox, QFormLayout, QMessageBox, QDialog, QDialogButtonBox, QGridLayout,
    QFileDialog,
) # Add QFont
from PyQt5.QtCore import Qt, QTimer
from config import secret_manager # Import the global secret_manager
from PyQt5.QtGui import QIcon

SECRET_SETUP_FIELDS = [
    ("db_host", "DB host:"),
    ("db_port", "DB Port:"),
    ("db_name", "DB name:"),
    ("db_user", "DB user:"),
    ("db_password", "DB password:"),
    ("credentials_json", "JSON credentials:"),
    ("google_wallet_issuer_id", "Google Wallet Issuer ID:"),
    ("ecp_verification_base_url", "eCP verification base URL:"),
    ("ecp_verification_webroot", "eCP verification webroot:"),
    ("project_id", "Google Cloud project:"),
    ("bucket_name", "Bucket name:"),
    ("logo_pic", "Society Logo file:"),
    ("crypt_key", "Crypt key:"),
    ("smtp_server", "SMTP Server:"),
    ("smtp_port", "SMTP Port:"),
    ("smtp_user", "SMTP User:"),
    ("smtp_password", "SMTP Password:"),
    ("log_level", "Log level:"),
    ("ecp_signing_key_id", "eCP signing key ID:"),
    ("ecp_signing_private_key_b64", "eCP signing private key (base64 PEM):"),
    ("ftp_host", "FTP Host:"),
    ("ftp_port", "FTP Port:"),
    ("ftp_user", "FTP User:"),
    ("ftp_password", "FTP Password:"),
    ("ftp_base_dir", "FTP Base directory:"),
    ("ftp_use_tls", "FTP Use TLS (true/false):"),
]

SENSITIVE_SECRET_FIELDS = {
    "db_password",
    "credentials_json",
    "crypt_key",
    "ecp_signing_private_key_b64",
    "smtp_password",
    "ftp_password",
}

class PinDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle(self.tr("Enter PIN"))
        self.result = False
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowMaximizeButtonHint)

        icon_path = os.path.join(os.path.dirname(__file__), "icons", "Logo_sss.ico")  # Adjust path if necessary
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))
 
        layout = QVBoxLayout()
        label = QLabel("PIN:")
        self.pin_entry = QLineEdit()
        self.pin_entry.setFixedHeight(32) # Increase field height
        self.pin_entry.setEchoMode(QLineEdit.Password)
        self.pin_entry.setAlignment(Qt.AlignLeft)
        layout.addWidget(label)
        layout.addWidget(self.pin_entry)
        self.setMinimumWidth(350) # Set minimum dialog width

        button_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        button_box.accepted.connect(self.check_pin)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

        self.setLayout(layout)
        # Timer for automatic PIN check
        self.auto_check_timer = QTimer(self)
        self.auto_check_timer.setSingleShot(True)
        self.auto_check_timer.timeout.connect(self.attempt_auto_accept)
        self.pin_entry.textChanged.connect(self.schedule_auto_check)

    def schedule_auto_check(self):
        # Start or restart the timer with a short delay (e.g., 500ms)
        self.auto_check_timer.start(500)

    def attempt_auto_accept(self):
        pin = self.pin_entry.text()
        if pin and secret_manager.decrypt_file(pin): # Only attempt if PIN is not empty
            self.result = True
            self.accept()

    def check_pin(self):
        self.auto_check_timer.stop()
        pin = self.pin_entry.text()
        if secret_manager.decrypt_file(pin): # use the global secret_manager
            self.result = True
            self.accept()
        else:
            QMessageBox.critical(self, "Error", self.tr("Incorrect PIN!"))
            self.pin_entry.clear()
            self.pin_entry.setFocus()

class NewPinDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle(self.tr("Enter New PIN"))
        self.result = None
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowMaximizeButtonHint)

        icon_path = os.path.join(os.path.dirname(__file__), "icons", "Logo_sss.ico")  # Adjust path if necessary
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        layout = QFormLayout()
        self.new_pin_entry = QLineEdit()
        self.new_pin_entry.setFixedHeight(32) # Increase field height
        self.new_pin_entry.setEchoMode(QLineEdit.Password)
        self.new_pin_entry.setAlignment(Qt.AlignLeft)
        self.confirm_pin_entry = QLineEdit()
        self.confirm_pin_entry.setFixedHeight(32) # Increase field height
        self.confirm_pin_entry.setEchoMode(QLineEdit.Password)
        self.confirm_pin_entry.setAlignment(Qt.AlignLeft)
        layout.addRow(self.tr("New PIN:"), self.new_pin_entry)
        layout.addRow(self.tr("Confirm PIN:"), self.confirm_pin_entry)

        self.setMinimumWidth(450) # Set minimum dialog width

        button_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        button_box.accepted.connect(self.check_pins)
        button_box.rejected.connect(self.reject)
        layout.addRow(button_box)
        
        self.setLayout(layout)

    def check_pins(self):
        new_pin = self.new_pin_entry.text()
        confirmed_pin = self.confirm_pin_entry.text()
        if new_pin == confirmed_pin:
            if len(new_pin) >= 8:
                self.result = new_pin
                self.accept()
            else:
                QMessageBox.critical(self, "Error", self.tr("PIN must be at least 8 characters long!"))
        else:
            QMessageBox.critical(self, "Error", self.tr("PINs do not match!"))
            self.new_pin_entry.clear()
            self.confirm_pin_entry.clear()

class SecretSetupGUI(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(self.tr("Secrets Setup"))
        self.secrets = {}
        self.entries = {} # Window enlargement
        self.setFixedSize(900, 720)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowMaximizeButtonHint)

        icon_path = os.path.join(os.path.dirname(__file__), "icons", "Logo_sss.ico")  # Adjust path if necessary
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        self.create_widgets()

    def create_widgets(self):
        layout = QVBoxLayout()
        grid = QGridLayout()
        layout.addLayout(grid)

        row = 0
        for key, label_text in SECRET_SETUP_FIELDS:
            label = QLabel(label_text)
            if key == "log_level":
                entry = QComboBox()
                entry.addItems(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
                entry.setMinimumWidth(500)
                grid.addWidget(label, row, 0)
                grid.addWidget(entry, row, 1)
            else:
                entry = QLineEdit()
                entry.setFixedHeight(32) # Increase field height
                entry.setMinimumWidth(500) # Adjust minimum field width
                entry.setAlignment(Qt.AlignLeft)
                if key in SENSITIVE_SECRET_FIELDS:
                    entry.setEchoMode(QLineEdit.Password)
                grid.addWidget(label, row, 0)
                if key == "credentials_json":
                    field_row = QHBoxLayout()
                    field_row.addWidget(entry)
                    browse_button = QPushButton(self.tr("Import JSON key file..."))
                    browse_button.clicked.connect(self.import_credentials_json)
                    field_row.addWidget(browse_button)
                    grid.addLayout(field_row, row, 1)
                else:
                    grid.addWidget(entry, row, 1)
            self.entries[key] = entry
            row += 1

        self.save_button = QPushButton(self.tr("Save"))
        self.save_button.clicked.connect(self.save_secrets)
        layout.addWidget(self.save_button)

    def import_credentials_json(self):
        """Import a GCP service account key file so its content lives inside
        the encrypted secrets.properties instead of relying on an external
        file path that can go missing on another machine."""
        filename, _ = QFileDialog.getOpenFileName(
            self,
            self.tr("Select GCP service account JSON key"),
            "",
            self.tr("JSON files (*.json)"),
        )
        if not filename:
            return

        try:
            with open(filename, "r", encoding="utf-8") as key_file:
                content = key_file.read()
            parsed = json.loads(content)
        except (OSError, ValueError) as exc:
            QMessageBox.critical(
                self,
                self.tr("Error"),
                self.tr("Could not read a valid JSON key file: %s") % exc,
            )
            return

        if parsed.get("type") != "service_account":
            QMessageBox.warning(
                self,
                self.tr("Warning"),
                self.tr(
                    "This does not look like a GCP service account key "
                    "(missing \"type\": \"service_account\"). It was imported anyway; "
                    "double-check the file if uploads keep failing."
                ),
            )

        self.entries["credentials_json"].setText(json.dumps(parsed))
        if "project_id" in parsed and not self.entries["project_id"].text():
            self.entries["project_id"].setText(parsed["project_id"])
        QMessageBox.information(
            self,
            self.tr("Imported"),
            self.tr("The key content was loaded. Click Save to store it encrypted."),
        )


        self.setLayout(layout)

    def load_secrets(self):
        if secret_manager.secrets:
            for key, value in secret_manager.secrets.items():
                if key in self.entries:
                    self._set_entry_value(self.entries[key], value)

    def _set_entry_value(self, entry, value):
        if isinstance(entry, QComboBox):
            value = str(value).upper()
            index = entry.findText(value)
            if index < 0:
                entry.addItem(value)
                index = entry.findText(value)
            entry.setCurrentIndex(index)
        else:
            entry.setText(value)

    def _get_entry_value(self, entry):
        if isinstance(entry, QComboBox):
            return entry.currentText()
        return entry.text()

    def save_secrets(self):
        secrets_to_save = {}
        for key, entry in self.entries.items():
            secrets_to_save[key] = self._get_entry_value(entry)

        if secret_manager.pin:
            pin = secret_manager.pin
        else:
            new_pin_dialog = NewPinDialog(self)
            if new_pin_dialog.exec_() == QDialog.Accepted:
                pin = new_pin_dialog.result
            else:
                return

        if secret_manager.encrypt_and_save_file(secrets_to_save, pin):
            QMessageBox.information(self, self.tr("Success"), self.tr("Secrets were saved successfully!"))
            self.close()
        else:
            QMessageBox.critical(self, self.tr("Error"), self.tr("Failed to save secrets!"))

def run_setup(app):
    gui = SecretSetupGUI()
    gui.load_secrets()
    gui.show()
    app.exec_()
    return secret_manager

def show_pin_dialog(app):
    pin_dialog = PinDialog()
    if pin_dialog.exec_() == QDialog.Rejected or not pin_dialog.result:
        return False # return False if decryption failed
    return True # return True if decryption succeeded

if __name__ == "__main__":
    import sys
    from PyQt5.QtGui import QFont # Import QFont

    app = QApplication(sys.argv)

    default_font = QFont()
    default_font.setPointSize(11) # Set a larger font size (e.g., 11pt)
    app.setFont(default_font)

    # Attempt to load and decrypt existing secrets if the file exists
    if os.path.exists(secret_manager.properties_file):
        print(f"INFO: File '{secret_manager.properties_file}' exists. Attempting decryption...")
        if not show_pin_dialog(app):
            # If decryption failed (incorrect PIN or canceled),
            # secret_manager.secrets will remain empty.
            # The GUI will open with empty fields for new setup.
            QMessageBox.warning(None, "Info",
                                "Failed to decrypt existing settings or the operation was canceled. "
                                "You can enter new settings, which will overwrite the original file (if it existed).")
        else:
            print("INFO: Existing secrets were successfully decrypted.")

    setup_gui = SecretSetupGUI()
    # load_secrets() loads values from secret_manager.secrets (if they were successfully decrypted)
    setup_gui.load_secrets()
    setup_gui.show()
    sys.exit(app.exec_())
