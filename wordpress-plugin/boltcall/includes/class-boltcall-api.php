<?php
/**
 * Boltcall API client — posts leads to the lead-webhook endpoint.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Boltcall_API {

	public static function send_lead( $data, $source = 'wordpress' ) {
		$user_id = trim( (string) get_option( 'boltcall_user_id', '' ) );
		if ( '' === $user_id ) {
			return new WP_Error( 'no_user_id', __( 'Boltcall user ID is not configured.', 'boltcall' ) );
		}

		$endpoint = BOLTCALL_API_BASE . '/.netlify/functions/lead-webhook/' . rawurlencode( $user_id );

		$clean = self::sanitize_payload( $data );
		$payload = array_merge(
			array(
				'source'     => $source,
				'source_url' => isset( $_SERVER['HTTP_REFERER'] ) ? esc_url_raw( wp_unslash( $_SERVER['HTTP_REFERER'] ) ) : home_url( '/' ),
			),
			self::normalize_lead_fields( $clean ),
			$clean
		);

		$headers = array(
			'Content-Type' => 'application/json',
			'User-Agent'   => 'Boltcall-WP/' . BOLTCALL_VERSION . '; ' . home_url( '/' ),
		);
		$api_key = trim( (string) get_option( 'boltcall_api_key', '' ) );
		if ( '' !== $api_key && 0 === strpos( $api_key, 'bc_' ) ) {
			$headers['Authorization'] = 'Bearer ' . $api_key;
		}

		$response = wp_remote_post(
			$endpoint,
			array(
				'timeout'     => 8,
				'redirection' => 2,
				'headers'     => $headers,
				'body'        => wp_json_encode( $payload ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = wp_remote_retrieve_body( $response );
		$decoded = json_decode( $body, true );

		if ( $status >= 200 && $status < 300 ) {
			return array( 'success' => true, 'status' => $status, 'body' => $decoded );
		}

		$error = is_array( $decoded ) && isset( $decoded['error'] )
			? $decoded['error']
			: sprintf( __( 'HTTP %d', 'boltcall' ), $status );
		return new WP_Error( 'boltcall_api_error', $error, array( 'status' => $status, 'body' => $decoded ) );
	}

	public static function send_test_lead() {
		return self::send_lead(
			array(
				'name'   => 'WordPress Test Lead',
				'email'  => 'test+' . time() . '@example.com',
				'phone'  => '+15555550123',
				'source' => 'wordpress_test',
			),
			'wordpress_test'
		);
	}

	// Map common form-field synonyms (your-email, contact_phone, full_name, ...) to
	// the { email, phone, name } the webhook expects. Skips keys already present.
	public static function normalize_lead_fields( $clean ) {
		$syn = array(
			'email' => array( 'email', 'your_email', 'user_email', 'contact_email', 'e_mail', 'email_address', 'input_email' ),
			'phone' => array( 'phone', 'your_phone', 'phone_number', 'tel', 'telephone', 'mobile', 'contact_phone', 'input_phone' ),
			'name'  => array( 'name', 'your_name', 'full_name', 'fullname', 'contact_name', 'input_name' ),
		);
		$lookup = array();
		foreach ( $clean as $k => $v ) {
			$lookup[ str_replace( '-', '_', $k ) ] = $v;
		}
		$out = array();
		foreach ( $syn as $target => $keys ) {
			if ( isset( $lookup[ $target ] ) && '' !== $lookup[ $target ] ) continue;
			foreach ( $keys as $k ) {
				if ( isset( $lookup[ $k ] ) && '' !== $lookup[ $k ] ) { $out[ $target ] = $lookup[ $k ]; break; }
			}
		}
		return $out;
	}

	public static function sanitize_payload( $data ) {
		$clean = array();
		foreach ( (array) $data as $key => $value ) {
			$key_lower = strtolower( (string) $key );
			if ( preg_match( '/password|credit|card|cvv|ssn|pin/i', $key_lower ) ) {
				continue;
			}
			if ( is_array( $value ) ) {
				$value = implode( ', ', array_map( 'strval', $value ) );
			}
			$value = is_scalar( $value ) ? (string) $value : '';
			$clean[ sanitize_key( $key_lower ) ] = sanitize_text_field( $value );
		}
		return $clean;
	}
}
