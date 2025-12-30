<?php
/**
 * Plugin Name: Lovable Document Processor for Barn2 DLP
 * Plugin URI: https://lovable.dev
 * Description: Automatically processes document uploads with AI to extract metadata and create Document Library Pro entries.
 * Version: 1.0.0
 * Author: Lovable
 * License: GPL v2 or later
 * Text Domain: lovable-doc-processor
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('LDP_VERSION', '1.0.0');
define('LDP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('LDP_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class Lovable_Document_Processor {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('add_attachment', array($this, 'process_new_attachment'), 10, 1);
        add_filter('attachment_fields_to_edit', array($this, 'add_attachment_fields'), 10, 2);
        add_action('wp_ajax_ldp_process_attachment', array($this, 'ajax_process_attachment'));
        add_action('wp_ajax_ldp_bulk_process', array($this, 'ajax_bulk_process'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('Lovable Document Processor', 'lovable-doc-processor'),
            __('Lovable Docs', 'lovable-doc-processor'),
            'manage_options',
            'lovable-doc-processor',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('ldp_settings', 'ldp_api_endpoint');
        register_setting('ldp_settings', 'ldp_api_secret');
        register_setting('ldp_settings', 'ldp_auto_process');
        register_setting('ldp_settings', 'ldp_auto_create_dlp');
        register_setting('ldp_settings', 'ldp_default_status');
        register_setting('ldp_settings', 'ldp_file_types');
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Lovable Document Processor Settings', 'lovable-doc-processor'); ?></h1>
            
            <form method="post" action="options.php">
                <?php settings_fields('ldp_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="ldp_api_endpoint"><?php _e('API Endpoint', 'lovable-doc-processor'); ?></label>
                        </th>
                        <td>
                            <input type="url" 
                                   id="ldp_api_endpoint" 
                                   name="ldp_api_endpoint" 
                                   value="<?php echo esc_attr(get_option('ldp_api_endpoint', 'https://tcdkvxorsyqsrxolxoni.supabase.co/functions/v1/process-document')); ?>" 
                                   class="regular-text"
                                   placeholder="https://your-project.supabase.co/functions/v1/process-document" />
                            <p class="description"><?php _e('The Lovable/Supabase edge function URL for document processing.', 'lovable-doc-processor'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="ldp_api_secret"><?php _e('API Secret', 'lovable-doc-processor'); ?></label>
                        </th>
                        <td>
                            <input type="password" 
                                   id="ldp_api_secret" 
                                   name="ldp_api_secret" 
                                   value="<?php echo esc_attr(get_option('ldp_api_secret', '')); ?>" 
                                   class="regular-text" />
                            <p class="description"><?php _e('The shared secret for API authentication (must match DOCUMENT_API_SECRET in Lovable).', 'lovable-doc-processor'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="ldp_auto_process"><?php _e('Auto-Process Uploads', 'lovable-doc-processor'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="ldp_auto_process" 
                                   name="ldp_auto_process" 
                                   value="1" 
                                   <?php checked(get_option('ldp_auto_process', '1'), '1'); ?> />
                            <label for="ldp_auto_process"><?php _e('Automatically process new document uploads with AI', 'lovable-doc-processor'); ?></label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="ldp_auto_create_dlp"><?php _e('Auto-Create DLP Documents', 'lovable-doc-processor'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="ldp_auto_create_dlp" 
                                   name="ldp_auto_create_dlp" 
                                   value="1" 
                                   <?php checked(get_option('ldp_auto_create_dlp', '0'), '1'); ?> />
                            <label for="ldp_auto_create_dlp"><?php _e('Automatically create Document Library Pro entries after processing', 'lovable-doc-processor'); ?></label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="ldp_default_status"><?php _e('Default Post Status', 'lovable-doc-processor'); ?></label>
                        </th>
                        <td>
                            <select id="ldp_default_status" name="ldp_default_status">
                                <option value="draft" <?php selected(get_option('ldp_default_status', 'draft'), 'draft'); ?>><?php _e('Draft', 'lovable-doc-processor'); ?></option>
                                <option value="pending" <?php selected(get_option('ldp_default_status', 'draft'), 'pending'); ?>><?php _e('Pending Review', 'lovable-doc-processor'); ?></option>
                                <option value="publish" <?php selected(get_option('ldp_default_status', 'draft'), 'publish'); ?>><?php _e('Published', 'lovable-doc-processor'); ?></option>
                            </select>
                            <p class="description"><?php _e('Default status for auto-created DLP documents.', 'lovable-doc-processor'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="ldp_file_types"><?php _e('File Types to Process', 'lovable-doc-processor'); ?></label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="ldp_file_types" 
                                   name="ldp_file_types" 
                                   value="<?php echo esc_attr(get_option('ldp_file_types', 'pdf')); ?>" 
                                   class="regular-text" />
                            <p class="description"><?php _e('Comma-separated list of file extensions to process (e.g., pdf,doc,docx). Currently only PDF is supported.', 'lovable-doc-processor'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <hr />
            
            <h2><?php _e('Bulk Processing', 'lovable-doc-processor'); ?></h2>
            <p><?php _e('Process existing PDF attachments in your media library.', 'lovable-doc-processor'); ?></p>
            
            <?php
            $pdf_count = $this->count_unprocessed_pdfs();
            ?>
            
            <p>
                <strong><?php printf(__('Unprocessed PDFs: %d', 'lovable-doc-processor'), $pdf_count); ?></strong>
            </p>
            
            <button type="button" id="ldp-bulk-process" class="button button-secondary" <?php echo $pdf_count === 0 ? 'disabled' : ''; ?>>
                <?php _e('Process All Unprocessed PDFs', 'lovable-doc-processor'); ?>
            </button>
            
            <div id="ldp-bulk-progress" style="display:none; margin-top: 15px;">
                <div class="ldp-progress-bar" style="width: 100%; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                    <div class="ldp-progress-fill" style="width: 0%; height: 20px; background: #0073aa; transition: width 0.3s;"></div>
                </div>
                <p class="ldp-progress-text"></p>
            </div>
            
            <hr />
            
            <h2><?php _e('Test Connection', 'lovable-doc-processor'); ?></h2>
            <button type="button" id="ldp-test-connection" class="button button-secondary">
                <?php _e('Test API Connection', 'lovable-doc-processor'); ?>
            </button>
            <div id="ldp-test-result" style="margin-top: 10px;"></div>
        </div>
        <?php
    }
    
    /**
     * Count unprocessed PDF attachments
     */
    private function count_unprocessed_pdfs() {
        global $wpdb;
        
        $count = $wpdb->get_var("
            SELECT COUNT(*) 
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_ldp_processed'
            WHERE p.post_type = 'attachment' 
            AND p.post_mime_type = 'application/pdf'
            AND (pm.meta_value IS NULL OR pm.meta_value != '1')
        ");
        
        return intval($count);
    }
    
    /**
     * Enqueue admin scripts
     */
    public function enqueue_admin_scripts($hook) {
        if ('settings_page_lovable-doc-processor' === $hook || 'upload.php' === $hook || 'post.php' === $hook) {
            wp_enqueue_script(
                'ldp-admin',
                LDP_PLUGIN_URL . 'assets/admin.js',
                array('jquery'),
                LDP_VERSION,
                true
            );
            
            wp_localize_script('ldp-admin', 'ldpAdmin', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('ldp_nonce'),
                'strings' => array(
                    'processing' => __('Processing...', 'lovable-doc-processor'),
                    'success' => __('Successfully processed!', 'lovable-doc-processor'),
                    'error' => __('Error processing document.', 'lovable-doc-processor'),
                    'testSuccess' => __('Connection successful!', 'lovable-doc-processor'),
                    'testFailed' => __('Connection failed: ', 'lovable-doc-processor'),
                )
            ));
        }
    }
    
    /**
     * Process new attachment on upload
     */
    public function process_new_attachment($attachment_id) {
        // Check if auto-processing is enabled
        if (get_option('ldp_auto_process', '1') !== '1') {
            return;
        }
        
        // Get attachment details
        $attachment = get_post($attachment_id);
        if (!$attachment) {
            return;
        }
        
        // Check if it's a PDF
        if ($attachment->post_mime_type !== 'application/pdf') {
            return;
        }
        
        // Process the document
        $result = $this->process_document($attachment_id);
        
        if ($result && $result['success']) {
            // Mark as processed
            update_post_meta($attachment_id, '_ldp_processed', '1');
            update_post_meta($attachment_id, '_ldp_data', $result['data']);
            
            // Auto-create DLP document if enabled
            if (get_option('ldp_auto_create_dlp', '0') === '1') {
                $this->create_dlp_document($attachment_id, $result['data']);
            }
        }
    }
    
    /**
     * Call the Lovable API to process a document
     */
    public function process_document($attachment_id) {
        $api_endpoint = get_option('ldp_api_endpoint', '');
        $api_secret = get_option('ldp_api_secret', '');
        
        if (empty($api_endpoint) || empty($api_secret)) {
            error_log('Lovable Document Processor: API endpoint or secret not configured');
            return false;
        }
        
        $attachment = get_post($attachment_id);
        $file_url = wp_get_attachment_url($attachment_id);
        $file_path = get_attached_file($attachment_id);
        $file_name = basename($file_path);
        
        $response = wp_remote_post($api_endpoint, array(
            'timeout' => 60,
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'fileUrl' => $file_url,
                'fileName' => $file_name,
                'mimeType' => $attachment->post_mime_type,
                'mediaId' => $attachment_id,
                'apiSecret' => $api_secret,
            )),
        ));
        
        if (is_wp_error($response)) {
            error_log('Lovable Document Processor: API request failed - ' . $response->get_error_message());
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success'])) {
            error_log('Lovable Document Processor: Invalid API response - ' . $body);
            return false;
        }
        
        return $data;
    }
    
    /**
     * Create a Document Library Pro document from processed data
     */
    public function create_dlp_document($attachment_id, $data) {
        // Check if DLP post type exists
        if (!post_type_exists('dlp_document')) {
            error_log('Lovable Document Processor: dlp_document post type not found. Is Document Library Pro active?');
            return false;
        }
        
        // Build post title
        $title = '';
        if (!empty($data['standardNumber'])) {
            $title = $data['standardNumber'];
            if (!empty($data['documentTitle'])) {
                $title .= ' - ' . $data['documentTitle'];
            }
        } elseif (!empty($data['documentTitle'])) {
            $title = $data['documentTitle'];
        } else {
            $title = basename(get_attached_file($attachment_id));
        }
        
        // Create the post
        $post_data = array(
            'post_title'   => sanitize_text_field($title),
            'post_content' => isset($data['excerpt']) ? sanitize_textarea_field($data['excerpt']) : '',
            'post_status'  => get_option('ldp_default_status', 'draft'),
            'post_type'    => 'dlp_document',
        );
        
        $post_id = wp_insert_post($post_data);
        
        if (is_wp_error($post_id)) {
            error_log('Lovable Document Processor: Failed to create DLP document - ' . $post_id->get_error_message());
            return false;
        }
        
        // Set category taxonomy (doc_categories)
        if (!empty($data['categorySlug']) && taxonomy_exists('doc_categories')) {
            // Try to find or create the category
            $category = get_term_by('slug', $data['categorySlug'], 'doc_categories');
            
            if (!$category) {
                // Create the category structure
                $parent_term = get_term_by('slug', 'standards', 'doc_categories');
                $parent_id = 0;
                
                if (!$parent_term) {
                    $parent_result = wp_insert_term('Standards', 'doc_categories');
                    if (!is_wp_error($parent_result)) {
                        $parent_id = $parent_result['term_id'];
                    }
                } else {
                    $parent_id = $parent_term->term_id;
                }
                
                // Create the child category
                $child_name = $data['category'] === 'Standards > Service' ? 'Service' : 'System';
                $result = wp_insert_term($child_name, 'doc_categories', array('parent' => $parent_id));
                
                if (!is_wp_error($result)) {
                    wp_set_object_terms($post_id, array($result['term_id']), 'doc_categories');
                }
            } else {
                wp_set_object_terms($post_id, array($category->term_id), 'doc_categories');
            }
        }
        
        // Set tags
        if (!empty($data['tags']) && is_array($data['tags'])) {
            wp_set_object_terms($post_id, $data['tags'], 'post_tag');
        }
        
        // Attach the document file using DLP's expected meta keys
        update_post_meta($post_id, '_dlp_attached_file_id', $attachment_id);
        
        // Store standard number and document title as custom fields
        if (!empty($data['standardNumber'])) {
            update_post_meta($post_id, '_ldp_standard_number', $data['standardNumber']);
        }
        if (!empty($data['documentTitle'])) {
            update_post_meta($post_id, '_ldp_document_title', $data['documentTitle']);
        }
        
        // Link back to the DLP document from the attachment
        update_post_meta($attachment_id, '_ldp_dlp_document_id', $post_id);
        
        return $post_id;
    }
    
    /**
     * Add custom fields to attachment edit screen
     */
    public function add_attachment_fields($form_fields, $post) {
        if ($post->post_mime_type !== 'application/pdf') {
            return $form_fields;
        }
        
        $processed = get_post_meta($post->ID, '_ldp_processed', true);
        $data = get_post_meta($post->ID, '_ldp_data', true);
        
        $status_html = '';
        if ($processed === '1' && $data) {
            $status_html = '<div style="background: #d4edda; padding: 10px; border-radius: 3px; margin-bottom: 10px;">';
            $status_html .= '<strong>' . esc_html__('AI Processed', 'lovable-doc-processor') . '</strong><br>';
            if (!empty($data['standardNumber'])) {
                $status_html .= '<strong>Standard:</strong> ' . esc_html($data['standardNumber']) . '<br>';
            }
            if (!empty($data['documentTitle'])) {
                $status_html .= '<strong>Title:</strong> ' . esc_html($data['documentTitle']) . '<br>';
            }
            if (!empty($data['category'])) {
                $status_html .= '<strong>Category:</strong> ' . esc_html($data['category']) . '<br>';
            }
            $status_html .= '</div>';
        } else {
            $status_html = '<div style="background: #fff3cd; padding: 10px; border-radius: 3px; margin-bottom: 10px;">';
            $status_html .= esc_html__('Not yet processed with AI', 'lovable-doc-processor');
            $status_html .= '</div>';
        }
        
        $status_html .= '<button type="button" class="button ldp-process-single" data-attachment-id="' . esc_attr($post->ID) . '">';
        $status_html .= $processed === '1' ? esc_html__('Reprocess with AI', 'lovable-doc-processor') : esc_html__('Process with AI', 'lovable-doc-processor');
        $status_html .= '</button>';
        
        $form_fields['ldp_status'] = array(
            'label' => __('Lovable AI', 'lovable-doc-processor'),
            'input' => 'html',
            'html' => $status_html,
        );
        
        return $form_fields;
    }
    
    /**
     * AJAX handler for processing single attachment
     */
    public function ajax_process_attachment() {
        check_ajax_referer('ldp_nonce', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(array('message' => __('Permission denied', 'lovable-doc-processor')));
        }
        
        $attachment_id = isset($_POST['attachment_id']) ? intval($_POST['attachment_id']) : 0;
        
        if (!$attachment_id) {
            wp_send_json_error(array('message' => __('Invalid attachment ID', 'lovable-doc-processor')));
        }
        
        $result = $this->process_document($attachment_id);
        
        if ($result && $result['success']) {
            update_post_meta($attachment_id, '_ldp_processed', '1');
            update_post_meta($attachment_id, '_ldp_data', $result['data']);
            
            // Create DLP document if requested
            $create_dlp = isset($_POST['create_dlp']) && $_POST['create_dlp'] === '1';
            $dlp_id = null;
            
            if ($create_dlp) {
                $dlp_id = $this->create_dlp_document($attachment_id, $result['data']);
            }
            
            wp_send_json_success(array(
                'data' => $result['data'],
                'dlp_id' => $dlp_id,
            ));
        } else {
            wp_send_json_error(array(
                'message' => isset($result['error']) ? $result['error'] : __('Processing failed', 'lovable-doc-processor'),
            ));
        }
    }
    
    /**
     * AJAX handler for bulk processing
     */
    public function ajax_bulk_process() {
        check_ajax_referer('ldp_nonce', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(array('message' => __('Permission denied', 'lovable-doc-processor')));
        }
        
        global $wpdb;
        
        // Get unprocessed PDFs (limit to 5 at a time to avoid timeout)
        $attachments = $wpdb->get_col("
            SELECT p.ID 
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_ldp_processed'
            WHERE p.post_type = 'attachment' 
            AND p.post_mime_type = 'application/pdf'
            AND (pm.meta_value IS NULL OR pm.meta_value != '1')
            LIMIT 5
        ");
        
        $processed = 0;
        $failed = 0;
        $results = array();
        
        foreach ($attachments as $attachment_id) {
            $result = $this->process_document($attachment_id);
            
            if ($result && $result['success']) {
                update_post_meta($attachment_id, '_ldp_processed', '1');
                update_post_meta($attachment_id, '_ldp_data', $result['data']);
                
                if (get_option('ldp_auto_create_dlp', '0') === '1') {
                    $this->create_dlp_document($attachment_id, $result['data']);
                }
                
                $processed++;
                $results[] = array(
                    'id' => $attachment_id,
                    'success' => true,
                    'title' => $result['data']['standardNumber'] ?? basename(get_attached_file($attachment_id)),
                );
            } else {
                $failed++;
                $results[] = array(
                    'id' => $attachment_id,
                    'success' => false,
                    'error' => $result['error'] ?? 'Unknown error',
                );
            }
            
            // Small delay to avoid rate limiting
            usleep(500000); // 0.5 second
        }
        
        $remaining = $this->count_unprocessed_pdfs();
        
        wp_send_json_success(array(
            'processed' => $processed,
            'failed' => $failed,
            'remaining' => $remaining,
            'results' => $results,
        ));
    }
}

// Initialize the plugin
add_action('plugins_loaded', array('Lovable_Document_Processor', 'get_instance'));
