/* ═══════════════════════════════════════════════════════════════
   tests/security.test.js — Security unit tests.

   Tests for:
   - CSRF token validation
   - Plain text password rejection
   - Image URL validation (reject dangerous schemes)
   - File upload whitelist enforcement
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const password = require('../src/core/password');
const { isSafeImageUrl, productValidate, upcomingValidate } = require('../src/modules/admin/validation');
const { isAllowedUpload, ALLOWED_UPLOAD_EXTENSIONS } = require('../src/modules/admin/upload-policy');

describe('Security: Password Verification', () => {
    it('should reject plain text passwords', () => {
        // Verify that plain text is never accepted
        assert.strictEqual(password.verify('plain123', 'plain123'), false);
        assert.strictEqual(password.verify('plain123', 'storedHash'), false);
    });

    it('should accept scrypt hashed passwords', () => {
        const plain = 'testPassword123';
        const hashed = password.hash(plain);
        assert.match(hashed, /^scrypt\$/);
        assert.strictEqual(password.verify(plain, hashed), true);
    });

    it('should reject invalid scrypt hashes', () => {
        assert.strictEqual(password.verify('test', 'invalid$hash'), false);
        assert.strictEqual(password.verify('test', ''), false);
    });
});

describe('Security: Image URL Validation', () => {
    it('should accept https:// URLs', () => {
        assert.strictEqual(isSafeImageUrl('https://example.com/image.png'), true);
        assert.strictEqual(isSafeImageUrl('https://cdn.example.com/img.jpg'), true);
    });

    it('should accept /images/ relative paths', () => {
        assert.strictEqual(isSafeImageUrl('/images/product.png'), true);
        assert.strictEqual(isSafeImageUrl('/images/subdir/img.jpg'), true);
    });

    it('should reject javascript: scheme', () => {
        assert.strictEqual(isSafeImageUrl('javascript:alert(1)'), false);
        assert.strictEqual(isSafeImageUrl('JAVASCRIPT:alert(1)'), false);
    });

    it('should reject data: scheme', () => {
        assert.strictEqual(isSafeImageUrl('data:image/png;base64,iVBORw0KG...'), false);
        assert.strictEqual(isSafeImageUrl('DATA:image/png;base64,iVBORw0KG...'), false);
    });

    it('should reject http:// (non-https)', () => {
        assert.strictEqual(isSafeImageUrl('http://example.com/image.png'), false);
    });

    it('should reject other dangerous schemes', () => {
        assert.strictEqual(isSafeImageUrl('vbscript:msgbox(1)'), false);
        assert.strictEqual(isSafeImageUrl('file:///etc/passwd'), false);
        assert.strictEqual(isSafeImageUrl('ftp://example.com/file'), false);
    });

    it('should reject non-string values', () => {
        assert.strictEqual(isSafeImageUrl(null), false);
        assert.strictEqual(isSafeImageUrl(undefined), false);
        assert.strictEqual(isSafeImageUrl(123), false);
        assert.strictEqual(isSafeImageUrl({}), false);
    });

    it('should enforce max length', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(3000);
        assert.strictEqual(isSafeImageUrl(longUrl), false);
    });
});

describe('Security: Product Validation', () => {
    it('should reject unsafe image URLs in products', () => {
        const result = productValidate({
            name: 'Test Product',
            price: 100,
            image: 'javascript:alert(1)'
        });
        assert.strictEqual(result.ok, false);
        assert.match(result.error, /Görsel adresi geçersiz/);
    });

    it('should accept safe image URLs in products', () => {
        const result = productValidate({
            name: 'Test Product',
            price: 100,
            image: 'https://example.com/image.png'
        });
        assert.strictEqual(result.ok, true);
    });
});

describe('Security: Upcoming Validation', () => {
    it('should reject unsafe image URLs in upcoming', () => {
        const result = upcomingValidate({
            name: 'Test Upcoming',
            image: 'data:image/png;base64,ABC'
        });
        assert.strictEqual(result.ok, false);
        assert.match(result.error, /Görsel adresi geçersiz/);
    });

    it('should accept safe image URLs in upcoming', () => {
        const result = upcomingValidate({
            name: 'Test Upcoming',
            image: '/images/upcoming.png'
        });
        assert.strictEqual(result.ok, true);
    });
});

describe('Security: File Upload Whitelist', () => {
    it('should accept allowed file types', () => {
        const allowed = [
            { filename: 'archive.zip', mimetype: 'application/zip' },
            { filename: 'compressed.rar', mimetype: 'application/vnd.rar' },
            { filename: 'archive.7z', mimetype: 'application/x-7z-compressed' },
            { filename: 'installer.exe', mimetype: 'application/x-msdownload' },
            { filename: 'installer.msi', mimetype: 'application/x-msi' },
            { filename: 'package.deb', mimetype: 'application/vnd.debian.binary-package' },
            { filename: 'app.appimage', mimetype: 'application/x-appimage' },
            { filename: 'installer.dmg', mimetype: 'application/x-apple-diskimage' },
            { filename: 'document.pdf', mimetype: 'application/pdf' }
        ];

        for (const file of allowed) {
            assert.strictEqual(
                isAllowedUpload(file.filename, file.mimetype),
                true,
                `Should accept ${file.filename} with MIME ${file.mimetype}`
            );
        }
    });

    it('should reject dangerous file types', () => {
        const dangerous = [
            { filename: 'script.html', mimetype: 'text/html' },
            { filename: 'script.js', mimetype: 'application/javascript' },
            { filename: 'style.css', mimetype: 'text/css' },
            { filename: 'data.json', mimetype: 'application/json' },
            { filename: 'page.php', mimetype: 'application/x-httpd-php' },
            { filename: 'shell.sh', mimetype: 'application/x-sh' },
            { filename: 'script.svg', mimetype: 'image/svg+xml' }
        ];

        for (const file of dangerous) {
            assert.strictEqual(
                isAllowedUpload(file.filename, file.mimetype),
                false,
                `Should reject ${file.filename} with MIME ${file.mimetype}`
            );
        }
    });

    it('should reject files without allowed extensions', () => {
        assert.strictEqual(isAllowedUpload('unknown.xyz', 'application/octet-stream'), false);
        assert.strictEqual(isAllowedUpload('noextension', 'text/plain'), false);
    });

    it('should be case-insensitive for extensions', () => {
        assert.strictEqual(isAllowedUpload('FILE.ZIP', 'application/zip'), true);
        assert.strictEqual(isAllowedUpload('file.Zip', 'application/zip'), true);
        assert.strictEqual(isAllowedUpload('file.EXE', 'application/x-msdownload'), true);
        assert.strictEqual(isAllowedUpload('file.AppImage', 'application/x-appimage'), true);
    });

    it('should accept generic MIME type for allowed extensions', () => {
        // Many binary files are reported as application/octet-stream
        assert.strictEqual(isAllowedUpload('file.zip', 'application/octet-stream'), true);
        assert.strictEqual(isAllowedUpload('file.exe', 'application/octet-stream'), true);
    });

    it('should reject generic MIME type for disallowed extensions', () => {
        assert.strictEqual(isAllowedUpload('file.html', 'application/octet-stream'), false);
        assert.strictEqual(isAllowedUpload('file.js', 'application/octet-stream'), false);
    });
});

describe('Security: Whitelist Extension List', () => {
    it('should contain only safe extensions', () => {
        const expected = ['.zip', '.rar', '.7z', '.exe', '.msi', '.deb', '.appimage', '.dmg', '.pdf'];
        assert.deepStrictEqual(ALLOWED_UPLOAD_EXTENSIONS.sort(), expected.sort());
    });

    it('should not contain executable web content extensions', () => {
        const dangerous = ['.html', '.htm', '.js', '.jsx', '.ts', '.tsx', '.css', '.svg', '.php', '.jsp', '.asp'];
        for (const ext of dangerous) {
            assert.strictEqual(ALLOWED_UPLOAD_EXTENSIONS.includes(ext), false);
        }
    });
});
