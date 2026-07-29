<?php
/**
 * Admin settings page: Settings → Boltcall
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Boltcall_Admin {

	const SETTINGS_GROUP = 'boltcall_settings';
	const OPTION_PAGE    = 'boltcall';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp_ajax_boltcall_test_lead', array( $this, 'ajax_test_lead' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( BOLTCALL_PLUGIN_FILE ), array( $this, 'add_settings_link' ) );
	}

	public function add_menu() {
		add_options_page(
			__( 'Boltcall Settings', 'boltcall' ),
			__( 'Boltcall', 'boltcall' ),
			'manage_options',
			self::OPTION_PAGE,
			array( $this, 'render_page' )
		);
	}

	public function register_settings() {
		register_setting( self::SETTINGS_GROUP, 'boltcall_user_id', array( 'sanitize_callback' => array( $this, 'sanitize_user_id' ) ) );
		register_setting( self::SETTINGS_GROUP, 'boltcall_api_key', array( 'sanitize_callback' => array( $this, 'sanitize_api_key' ) ) );
		register_setting( self::SETTINGS_GROUP, 'boltcall_enabled', array( 'sanitize_callback' => array( $this, 'sanitize_toggle' ) ) );
		register_setting( self::SETTINGS_GROUP, 'boltcall_auto_capture', array( 'sanitize_callback' => array( $this, 'sanitize_toggle' ) ) );
		register_setting( self::SETTINGS_GROUP, 'boltcall_form_selector', array( 'sanitize_callback' => 'sanitize_text_field' ) );
		register_setting( self::SETTINGS_GROUP, 'boltcall_integrations', array( 'sanitize_callback' => array( $this, 'sanitize_integrations' ) ) );
	}

	public function sanitize_user_id( $val ) {
		$val = trim( (string) $val );
		if ( '' === $val ) return '';
		if ( preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $val ) ) {
			return strtolower( $val );
		}
		add_settings_error( 'boltcall_user_id', 'invalid_uuid', __( 'Boltcall User ID must be a valid UUID. Copy it from your Boltcall dashboard → Instant Lead Reply → Web Form.', 'boltcall' ) );
		return '';
	}

	public function sanitize_api_key( $val ) {
		$val = trim( (string) $val );
		if ( '' === $val ) return '';
		if ( 0 !== strpos( $val, 'bc_' ) ) {
			add_settings_error( 'boltcall_api_key', 'invalid_key', __( 'Boltcall API key must start with bc_. Copy it from your Boltcall dashboard → Settings → API Keys.', 'boltcall' ) );
			return '';
		}
		return $val;
	}

	public function sanitize_toggle( $val ) {
		return '1' === (string) $val ? '1' : '0';
	}

	public function sanitize_integrations( $val ) {
		$keys = array( 'cf7', 'wpforms', 'gravity', 'elementor', 'ninja', 'fluent' );
		$out  = array();
		foreach ( $keys as $k ) {
			$out[ $k ] = ( is_array( $val ) && isset( $val[ $k ] ) && '1' === (string) $val[ $k ] ) ? '1' : '0';
		}
		return $out;
	}

	public function add_settings_link( $links ) {
		$url = admin_url( 'options-general.php?page=' . self::OPTION_PAGE );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'boltcall' ) . '</a>' );
		return $links;
	}

	public function enqueue_assets( $hook ) {
		if ( 'settings_page_' . self::OPTION_PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'boltcall-admin', BOLTCALL_PLUGIN_URL . 'assets/admin.css', array(), BOLTCALL_VERSION );
		wp_enqueue_script( 'boltcall-admin', BOLTCALL_PLUGIN_URL . 'assets/admin.js', array( 'jquery' ), BOLTCALL_VERSION, true );
		wp_localize_script(
			'boltcall-admin',
			'BoltcallAdmin',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'boltcall_test_lead' ),
				'strings' => array(
					'sending' => __( 'Sending test lead…', 'boltcall' ),
					'success' => __( 'Test lead sent successfully. Check your Boltcall dashboard.', 'boltcall' ),
					'missing' => __( 'Save your Boltcall User ID first.', 'boltcall' ),
				),
			)
		);
	}

	public function ajax_test_lead() {
		check_ajax_referer( 'boltcall_test_lead', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'Permission denied', 'boltcall' ) ), 403 );
		}

		$result = Boltcall_API::send_test_lead();
		if ( is_wp_error( $result ) ) {
			wp_send_json_error( array( 'message' => $result->get_error_message() ) );
		}
		wp_send_json_success( $result );
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$user_id       = (string) get_option( 'boltcall_user_id', '' );
		$api_key       = (string) get_option( 'boltcall_api_key', '' );
		$enabled       = '1' === get_option( 'boltcall_enabled', '1' );
		$auto          = '1' === get_option( 'boltcall_auto_capture', '0' );
		$selector      = (string) get_option( 'boltcall_form_selector', 'form[data-boltcall]' );
		$integrations  = (array) get_option(
			'boltcall_integrations',
			array( 'cf7' => '1', 'wpforms' => '1', 'gravity' => '1', 'elementor' => '1', 'ninja' => '1', 'fluent' => '1' )
		);
		$last_success  = get_transient( 'boltcall_last_success' );
		$last_error    = get_transient( 'boltcall_last_error' );

		$form_plugins = array(
			'cf7'       => array( 'label' => 'Contact Form 7',  'detect' => class_exists( 'WPCF7' ) ),
			'wpforms'   => array( 'label' => 'WPForms',         'detect' => function_exists( 'wpforms' ) ),
			'gravity'   => array( 'label' => 'Gravity Forms',   'detect' => class_exists( 'GFForms' ) ),
			'elementor' => array( 'label' => 'Elementor Forms', 'detect' => class_exists( 'ElementorPro\\Plugin' ) || defined( 'ELEMENTOR_PRO_VERSION' ) ),
			'ninja'     => array( 'label' => 'Ninja Forms',     'detect' => class_exists( 'Ninja_Forms' ) ),
			'fluent'    => array( 'label' => 'Fluent Forms',    'detect' => defined( 'FLUENTFORM' ) ),
		);
		?>
		<div class="wrap boltcall-settings">
			<div class="boltcall-header">
				<h1><?php esc_html_e( 'Boltcall — Instant Lead Capture', 'boltcall' ); ?></h1>
				<p class="boltcall-tagline">
					<?php esc_html_e( 'Every form submission on your site flows into Boltcall the moment it\'s sent. Your AI responds within seconds — by text, email, or call — so you never lose a job to a faster competitor.', 'boltcall' ); ?>
				</p>
			</div>

			<?php if ( ! $user_id ) : ?>
				<div class="notice notice-warning">
					<p><?php
						printf(
							wp_kses_post( __( 'Paste your <strong>Boltcall User ID</strong> below to start capturing leads. Copy it from the <a href="%s" target="_blank" rel="noopener">Instant Lead Reply</a> page in your Boltcall dashboard.', 'boltcall' ) ),
							esc_url( BOLTCALL_API_BASE . '/dashboard/instant-lead-reply' )
						);
					?></p>
				</div>
			<?php endif; ?>

			<?php settings_errors(); ?>

			<form method="post" action="options.php">
				<?php settings_fields( self::SETTINGS_GROUP ); ?>

				<div class="boltcall-card">
					<h2><?php esc_html_e( 'Connection', 'boltcall' ); ?></h2>
					<table class="form-table" role="presentation">
						<tbody>
							<tr>
								<th scope="row"><label for="boltcall_user_id"><?php esc_html_e( 'Boltcall User ID', 'boltcall' ); ?></label></th>
								<td>
									<input type="text" id="boltcall_user_id" name="boltcall_user_id" value="<?php echo esc_attr( $user_id ); ?>" class="regular-text code" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
									<p class="description">
										<?php
										printf(
											wp_kses_post( __( 'Find this on the <a href="%s" target="_blank" rel="noopener">Boltcall dashboard</a> → Instant Lead Reply → Web Form.', 'boltcall' ) ),
											esc_url( BOLTCALL_API_BASE . '/dashboard/instant-lead-reply' )
										);
										?>
									</p>
								</td>
							</tr>
							<tr>
								<th scope="row"><label for="boltcall_api_key"><?php esc_html_e( 'API Key', 'boltcall' ); ?></label></th>
								<td>
									<input type="text" id="boltcall_api_key" name="boltcall_api_key" value="<?php echo esc_attr( $api_key ); ?>" class="regular-text code" placeholder="bc_..." autocomplete="off" />
									<p class="description">
										<?php esc_html_e( 'Required. Create a key in the Boltcall dashboard → Settings → API Keys. Sent as an Authorization: Bearer header on every lead.', 'boltcall' ); ?>
									</p>
								</td>
							</tr>
							<tr>
								<th scope="row"><?php esc_html_e( 'Enable Boltcall', 'boltcall' ); ?></th>
								<td>
									<label>
										<input type="checkbox" name="boltcall_enabled" value="1" <?php checked( $enabled ); ?> />
										<?php esc_html_e( 'Capture leads from this site', 'boltcall' ); ?>
									</label>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="boltcall-card">
					<h2><?php esc_html_e( 'Form Plugin Integrations', 'boltcall' ); ?></h2>
					<p class="description"><?php esc_html_e( 'Boltcall reads submissions directly from these plugins — no form edits required.', 'boltcall' ); ?></p>
					<table class="form-table" role="presentation">
						<tbody>
							<?php foreach ( $form_plugins as $key => $meta ) :
								$checked  = isset( $integrations[ $key ] ) ? $integrations[ $key ] : '1';
								$detected = $meta['detect'];
								?>
								<tr>
									<th scope="row"><?php echo esc_html( $meta['label'] ); ?></th>
									<td>
										<label>
											<input type="checkbox" name="boltcall_integrations[<?php echo esc_attr( $key ); ?>]" value="1" <?php checked( '1', $checked ); ?> />
											<?php esc_html_e( 'Forward submissions to Boltcall', 'boltcall' ); ?>
										</label>
										<span class="boltcall-pill <?php echo $detected ? 'is-detected' : 'is-missing'; ?>">
											<?php echo $detected ? esc_html__( 'Detected', 'boltcall' ) : esc_html__( 'Not installed', 'boltcall' ); ?>
										</span>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>

				<div class="boltcall-card">
					<h2><?php esc_html_e( 'Generic Forms', 'boltcall' ); ?></h2>
					<p class="description"><?php esc_html_e( 'For forms not handled by the plugins above, Boltcall loads a small script that captures any <form> you mark.', 'boltcall' ); ?></p>
					<table class="form-table" role="presentation">
						<tbody>
							<tr>
								<th scope="row"><?php esc_html_e( 'Form selector', 'boltcall' ); ?></th>
								<td>
									<input type="text" name="boltcall_form_selector" value="<?php echo esc_attr( $selector ); ?>" class="regular-text code" />
									<p class="description">
										<?php
										echo wp_kses_post( __( 'CSS selector for forms to capture. Default: <code>form[data-boltcall]</code> — add <code>data-boltcall</code> to any form you want forwarded.', 'boltcall' ) );
										?>
									</p>
								</td>
							</tr>
							<tr>
								<th scope="row"><?php esc_html_e( 'Auto-capture all forms', 'boltcall' ); ?></th>
								<td>
									<label>
										<input type="checkbox" name="boltcall_auto_capture" value="1" <?php checked( $auto ); ?> />
										<?php esc_html_e( 'Capture every form on the site (overrides the selector above)', 'boltcall' ); ?>
									</label>
									<p class="description"><?php esc_html_e( 'Useful if you can\'t edit your forms. Skips fields that look like passwords or payment info.', 'boltcall' ); ?></p>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<?php submit_button(); ?>
			</form>

			<div class="boltcall-card">
				<h2><?php esc_html_e( 'Send a Test Lead', 'boltcall' ); ?></h2>
				<p><?php esc_html_e( 'Verify the connection. A fake lead will appear on your Boltcall Leads page.', 'boltcall' ); ?></p>
				<p>
					<button type="button" class="button button-primary" id="boltcall-test-lead" <?php disabled( ! $user_id ); ?>>
						<?php esc_html_e( 'Send Test Lead', 'boltcall' ); ?>
					</button>
					<span id="boltcall-test-result" class="boltcall-test-result" aria-live="polite"></span>
				</p>
				<?php if ( $last_success ) : ?>
					<p class="description"><?php printf( esc_html__( 'Last successful send: %s', 'boltcall' ), esc_html( $last_success ) ); ?></p>
				<?php endif; ?>
				<?php if ( $last_error ) : ?>
					<div class="notice notice-error inline"><p><?php printf( esc_html__( 'Last error: %s', 'boltcall' ), esc_html( $last_error ) ); ?></p></div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}
}
