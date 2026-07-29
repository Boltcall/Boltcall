<?php
/**
 * Plugin Name:       Boltcall – Instant Lead Capture
 * Plugin URI:        https://boltcall.org
 * Description:       Capture leads from any WordPress form instantly. Boltcall responds within seconds via SMS, email, or voice — so you never lose a job to a slower competitor.
 * Version:           1.1.0
 * Requires at least: 5.8
 * Requires PHP:      7.2
 * Author:            Boltcall
 * Author URI:        https://boltcall.org
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       boltcall
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BOLTCALL_VERSION', '1.1.0' );
define( 'BOLTCALL_PLUGIN_FILE', __FILE__ );
define( 'BOLTCALL_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BOLTCALL_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'BOLTCALL_API_BASE', 'https://boltcall.org' );

require_once BOLTCALL_PLUGIN_DIR . 'includes/class-boltcall-api.php';
require_once BOLTCALL_PLUGIN_DIR . 'includes/class-boltcall-embed.php';
require_once BOLTCALL_PLUGIN_DIR . 'includes/class-boltcall-form-hooks.php';
require_once BOLTCALL_PLUGIN_DIR . 'includes/class-boltcall-admin.php';

class Boltcall_Plugin {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'plugins_loaded', array( $this, 'init' ) );
		register_activation_hook( BOLTCALL_PLUGIN_FILE, array( $this, 'activate' ) );
	}

	public function init() {
		load_plugin_textdomain( 'boltcall', false, dirname( plugin_basename( BOLTCALL_PLUGIN_FILE ) ) . '/languages' );

		new Boltcall_Embed();
		new Boltcall_Form_Hooks();

		if ( is_admin() ) {
			new Boltcall_Admin();
		}
	}

	public function activate() {
		if ( false === get_option( 'boltcall_enabled' ) ) {
			add_option( 'boltcall_enabled', '1' );
		}
		if ( false === get_option( 'boltcall_auto_capture' ) ) {
			add_option( 'boltcall_auto_capture', '0' );
		}
		if ( false === get_option( 'boltcall_form_selector' ) ) {
			add_option( 'boltcall_form_selector', 'form[data-boltcall]' );
		}
		if ( false === get_option( 'boltcall_integrations' ) ) {
			add_option(
				'boltcall_integrations',
				array(
					'cf7'      => '1',
					'wpforms'  => '1',
					'gravity'  => '1',
					'elementor' => '1',
					'ninja'    => '1',
					'fluent'   => '1',
				)
			);
		}
	}
}

Boltcall_Plugin::instance();
