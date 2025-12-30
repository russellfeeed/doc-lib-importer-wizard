(function($) {
    'use strict';

    $(document).ready(function() {
        
        // Test connection button
        $('#ldp-test-connection').on('click', function() {
            var $button = $(this);
            var $result = $('#ldp-test-result');
            
            $button.prop('disabled', true).text(ldpAdmin.strings.processing);
            $result.html('');
            
            // Simple ping test - just check if the endpoint responds
            $.ajax({
                url: $('input[name="ldp_api_endpoint"]').val(),
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    test: true,
                    apiSecret: $('input[name="ldp_api_secret"]').val()
                }),
                success: function(response) {
                    if (response.success === false && response.error === 'Missing required fields: fileUrl, fileName') {
                        // This means the endpoint is responding correctly
                        $result.html('<span style="color: green;">✓ ' + ldpAdmin.strings.testSuccess + '</span>');
                    } else if (response.success === false && response.error && response.error.includes('Unauthorized')) {
                        $result.html('<span style="color: red;">✗ ' + ldpAdmin.strings.testFailed + 'Invalid API secret</span>');
                    } else {
                        $result.html('<span style="color: green;">✓ ' + ldpAdmin.strings.testSuccess + '</span>');
                    }
                },
                error: function(xhr, status, error) {
                    var message = error;
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.error) {
                            message = response.error;
                        }
                    } catch(e) {}
                    
                    // Check if it's just a missing fields error (which means connection works)
                    if (message.includes('Missing required fields')) {
                        $result.html('<span style="color: green;">✓ ' + ldpAdmin.strings.testSuccess + '</span>');
                    } else {
                        $result.html('<span style="color: red;">✗ ' + ldpAdmin.strings.testFailed + message + '</span>');
                    }
                },
                complete: function() {
                    $button.prop('disabled', false).text('Test API Connection');
                }
            });
        });
        
        // Bulk process button
        $('#ldp-bulk-process').on('click', function() {
            var $button = $(this);
            var $progress = $('#ldp-bulk-progress');
            var $progressFill = $progress.find('.ldp-progress-fill');
            var $progressText = $progress.find('.ldp-progress-text');
            
            $button.prop('disabled', true);
            $progress.show();
            
            function processBatch() {
                $.ajax({
                    url: ldpAdmin.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'ldp_bulk_process',
                        nonce: ldpAdmin.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            var data = response.data;
                            var message = 'Processed ' + data.processed + ' documents';
                            if (data.failed > 0) {
                                message += ' (' + data.failed + ' failed)';
                            }
                            message += '. ' + data.remaining + ' remaining.';
                            
                            $progressText.text(message);
                            
                            if (data.remaining > 0) {
                                // Continue processing
                                setTimeout(processBatch, 1000);
                            } else {
                                // Done
                                $progressFill.css('width', '100%');
                                $button.prop('disabled', true).text('All documents processed');
                            }
                        } else {
                            $progressText.text('Error: ' + (response.data.message || 'Unknown error'));
                            $button.prop('disabled', false);
                        }
                    },
                    error: function(xhr, status, error) {
                        $progressText.text('Error: ' + error);
                        $button.prop('disabled', false);
                    }
                });
            }
            
            processBatch();
        });
        
        // Single attachment process button
        $(document).on('click', '.ldp-process-single', function() {
            var $button = $(this);
            var attachmentId = $button.data('attachment-id');
            
            $button.prop('disabled', true).text(ldpAdmin.strings.processing);
            
            $.ajax({
                url: ldpAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'ldp_process_attachment',
                    nonce: ldpAdmin.nonce,
                    attachment_id: attachmentId,
                    create_dlp: '0'
                },
                success: function(response) {
                    if (response.success) {
                        $button.text(ldpAdmin.strings.success);
                        
                        // Show the extracted data
                        var data = response.data.data;
                        var html = '<div style="background: #d4edda; padding: 10px; border-radius: 3px; margin-top: 10px;">';
                        html += '<strong>AI Processed</strong><br>';
                        if (data.standardNumber) {
                            html += '<strong>Standard:</strong> ' + data.standardNumber + '<br>';
                        }
                        if (data.documentTitle) {
                            html += '<strong>Title:</strong> ' + data.documentTitle + '<br>';
                        }
                        if (data.category) {
                            html += '<strong>Category:</strong> ' + data.category + '<br>';
                        }
                        html += '</div>';
                        
                        $button.after(html);
                        
                        setTimeout(function() {
                            $button.text('Reprocess with AI').prop('disabled', false);
                        }, 2000);
                    } else {
                        $button.text(ldpAdmin.strings.error);
                        setTimeout(function() {
                            $button.text('Process with AI').prop('disabled', false);
                        }, 2000);
                    }
                },
                error: function() {
                    $button.text(ldpAdmin.strings.error);
                    setTimeout(function() {
                        $button.text('Process with AI').prop('disabled', false);
                    }, 2000);
                }
            });
        });
    });
    
})(jQuery);
