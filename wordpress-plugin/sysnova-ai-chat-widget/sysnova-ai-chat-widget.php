<?php
/**
 * Plugin Name: Sysnova AI Chat Widget
 * Description: Adds a premium floating AI chat widget connected to your Sysnova API.
 * Version: 1.0.0
 * Author: Sysnova AI
 */

if (!defined('ABSPATH')) {
    exit;
}

class SysnovaAiChatWidget
{
    private const OPTION_KEY = 'sysnova_widget_settings';

    public function __construct()
    {
        add_action('admin_menu', [$this, 'addAdminMenu']);
        add_action('admin_init', [$this, 'registerSettings']);
        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendAssets']);
    }

    public function addAdminMenu(): void
    {
        add_options_page(
            'Sysnova AI Widget',
            'Sysnova AI Widget',
            'manage_options',
            'sysnova-ai-widget',
            [$this, 'renderSettingsPage']
        );
    }

    public function registerSettings(): void
    {
        register_setting(
            'sysnova_widget_group',
            self::OPTION_KEY,
            [$this, 'sanitizeSettings']
        );
    }

    public function sanitizeSettings(array $input): array
    {
        return [
            'enabled' => !empty($input['enabled']) ? 1 : 0,
            'api_url' => esc_url_raw($input['api_url'] ?? ''),
            'stream_url' => esc_url_raw($input['stream_url'] ?? ''),
            'language' => sanitize_text_field($input['language'] ?? 'fr'),
            'title' => sanitize_text_field($input['title'] ?? 'Chat with us'),
            'assistant_label' => sanitize_text_field($input['assistant_label'] ?? 'Assistant'),
            'welcome_message' => sanitize_text_field($input['welcome_message'] ?? ''),
            'position' => ($input['position'] ?? 'right') === 'left' ? 'left' : 'right',
            'button_text' => sanitize_text_field($input['button_text'] ?? 'Send'),
            'toggle_text' => sanitize_text_field($input['toggle_text'] ?? 'Ask us'),
            'auto_open' => !empty($input['auto_open']) ? 1 : 0,
            'streaming' => !empty($input['streaming']) ? 1 : 0,
            'enable_lead_capture' => !empty($input['enable_lead_capture']) ? 1 : 0,
            'lead_required' => !empty($input['lead_required']) ? 1 : 0,
        ];
    }

    public function enqueueFrontendAssets(): void
    {
        $settings = get_option(self::OPTION_KEY, []);
        $enabled = isset($settings['enabled']) ? (int) $settings['enabled'] : 1;
        if ($enabled !== 1) {
            return;
        }

        $apiUrl = $settings['api_url'] ?? '';
        if (empty($apiUrl)) {
            return;
        }

        wp_enqueue_style(
            'sysnova-ai-widget-style',
            plugin_dir_url(__FILE__) . 'assets/widget.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'sysnova-ai-widget-script',
            plugin_dir_url(__FILE__) . 'assets/widget.js',
            [],
            '1.0.0',
            true
        );

        $domain = wp_parse_url(home_url(), PHP_URL_HOST);
        $config = [
            'apiUrl' => $apiUrl,
            'streamUrl' => $settings['stream_url'] ?? '',
            'domain' => $domain ?: '',
            'language' => $settings['language'] ?? 'fr',
            'title' => $settings['title'] ?? 'Chat with us',
            'assistantLabel' => $settings['assistant_label'] ?? 'Assistant',
            'welcomeMessage' => $settings['welcome_message'] ?? '',
            'position' => $settings['position'] ?? 'right',
            'buttonText' => $settings['button_text'] ?? 'Send',
            'toggleText' => $settings['toggle_text'] ?? 'Ask us',
            'autoOpen' => !empty($settings['auto_open']),
            'streaming' => !empty($settings['streaming']),
            'enableLeadCapture' => !empty($settings['enable_lead_capture']),
            'leadRequired' => !empty($settings['lead_required']),
        ];

        wp_add_inline_script(
            'sysnova-ai-widget-script',
            'window.SysnovaWidgetConfig = ' . wp_json_encode($config) . ';',
            'before'
        );
    }

    public function renderSettingsPage(): void
    {
        $settings = get_option(self::OPTION_KEY, []);
        ?>
        <div class="wrap">
            <h1>Sysnova AI Chat Widget</h1>
            <p>Configure your floating ecommerce chat widget for this website.</p>
            <form method="post" action="options.php">
                <?php settings_fields('sysnova_widget_group'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">Enable Widget</th>
                        <td>
                            <input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[enabled]" value="1" <?php checked(($settings['enabled'] ?? 1), 1); ?> />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">API URL</th>
                        <td>
                            <input class="regular-text" type="url" name="<?php echo esc_attr(self::OPTION_KEY); ?>[api_url]" value="<?php echo esc_attr($settings['api_url'] ?? 'https://api.sysnova.ai/api/public/chat'); ?>" />
                            <p class="description">Example: https://api.sysnova.ai/api/public/chat</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Stream URL</th>
                        <td>
                            <input class="regular-text" type="url" name="<?php echo esc_attr(self::OPTION_KEY); ?>[stream_url]" value="<?php echo esc_attr($settings['stream_url'] ?? 'https://api.sysnova.ai/api/public/chat/stream'); ?>" />
                            <p class="description">Example: https://api.sysnova.ai/api/public/chat/stream</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Default Language</th>
                        <td>
                            <input class="regular-text" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[language]" value="<?php echo esc_attr($settings['language'] ?? 'fr'); ?>" />
                            <p class="description">Use fr, ar, darija, or en.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Widget Title</th>
                        <td><input class="regular-text" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[title]" value="<?php echo esc_attr($settings['title'] ?? 'Chat with us'); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Assistant Label</th>
                        <td><input class="regular-text" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[assistant_label]" value="<?php echo esc_attr($settings['assistant_label'] ?? 'Assistant'); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Welcome Message</th>
                        <td><input class="regular-text" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[welcome_message]" value="<?php echo esc_attr($settings['welcome_message'] ?? ''); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Position</th>
                        <td>
                            <select name="<?php echo esc_attr(self::OPTION_KEY); ?>[position]">
                                <option value="right" <?php selected(($settings['position'] ?? 'right'), 'right'); ?>>Right</option>
                                <option value="left" <?php selected(($settings['position'] ?? 'right'), 'left'); ?>>Left</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Send Button Text</th>
                        <td><input class="regular-text" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[button_text]" value="<?php echo esc_attr($settings['button_text'] ?? 'Send'); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Toggle Button Text</th>
                        <td><input class="regular-text" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[toggle_text]" value="<?php echo esc_attr($settings['toggle_text'] ?? 'Ask us'); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Auto Open on Page Load</th>
                        <td>
                            <input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[auto_open]" value="1" <?php checked(($settings['auto_open'] ?? 0), 1); ?> />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Enable Streaming</th>
                        <td>
                            <input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[streaming]" value="1" <?php checked(($settings['streaming'] ?? 1), 1); ?> />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Enable Lead Capture</th>
                        <td>
                            <input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[enable_lead_capture]" value="1" <?php checked(($settings['enable_lead_capture'] ?? 0), 1); ?> />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Lead Required (name + phone)</th>
                        <td>
                            <input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[lead_required]" value="1" <?php checked(($settings['lead_required'] ?? 0), 1); ?> />
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

new SysnovaAiChatWidget();
