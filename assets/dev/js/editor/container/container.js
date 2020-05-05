import ArgsObject from '../../modules/imports/args-object';
import Panel from './panel';

/**
 * TODO: ViewsOptions
 * @typedef {(Marionette.View|Marionette.CompositeView|BaseElementView|SectionView)} ViewsOptions
 */

export default class Container extends ArgsObject {
	/**
	 * Container type.
	 *
	 * @type {string}
	 */
	type;

	/**
	 * Container id.
	 *
	 * @type {string}
	 */
	id;

	/**
	 * Document Object.
	 *
	 * @type  {{}}
	 */
	document;

	/**
	 * Container model.
	 *
	 * @type {Backbone.Model}
	 */
	model;

	/**
	 * Container settings.
	 *
	 * @type {Backbone.Model}
	 */
	settings;

	/**
	 * Container view.
	 *
	 * @type {ViewsOptions}
	 */
	view;

	/**
	 * Container parent.
	 *
	 * @type {Container}
	 */
	parent;

	/**
	 * Container children(s).
	 *
	 * @type {Array}
	 */
	children = [];

	/**
	 * Container dynamic.
	 *
	 * @type {Backbone.Model}
	 */
	dynamic;

	/**
	 * Container label.
	 *
	 * @type {string}
	 */
	label;

	/**
	 * Container controls.
	 *
	 * @type {{}}
	 */
	controls = {};

	/**
	 * Container renderer (The one who render).
	 *
	 * @type {Container}
	 */
	renderer;

	/**
	 * Container panel.
	 *
	 * @type {Panel}
	 */
	panel;

	/**
	 * Function constructor().
	 *
	 * Create container.
	 *
	 * @param {{}} args
	 *
	 * @throws {Error}
	 */
	constructor( args ) {
		super( args );

		// Validate args.
		this.validateArgs( args );

		args = Object.entries( args );

		// If empty.
		if ( 0 === args.length ) {
			throw Error( 'Container cannot be empty.' );
		}

		// Set properties, if not defined - keep the defaults.
		args.forEach( ( [ key, value ] ) => {
			this[ key ] = 'undefined' === typeof value ? this[ key ] : value;
		} );

		if ( 'undefined' === typeof this.renderer ) {
			this.renderer = this;
		}

		if ( ! this.document ) {
			this.document = elementor.documents.getCurrent();
		}

		this.dynamic = new Backbone.Model( this.settings.get( '__dynamic__' ) );
		this.panel = new Panel( this );

		this.handleRepeaterChildren();
	}

	validateArgs( args ) {
		this.requireArgumentType( 'type', 'string', args );
		this.requireArgumentType( 'id', 'string', args );

		this.requireArgumentInstance( 'settings', Backbone.Model, args );
		this.requireArgumentInstance( 'model', Backbone.Model, args );
	}

	handleRepeaterChildren() {
		// TODO: add a repeater attribute: `'repeater_type' => 'main`` and filter by it.
		const repeaterControls = Object.values( this.controls ).filter( ( control ) => {
			return 'repeater' === control.type;
		} );

		// Only if has one repeater convert it to container children.
		if ( 1 === repeaterControls.length ) {
			const mainRepeaterName = repeaterControls[ 0 ].name;

			this.settings.get( mainRepeaterName ).forEach( ( rowModel, index ) => {
				this.addRepeaterItem( mainRepeaterName, rowModel, index );
			} );
		}
	}

	addRepeaterItem( repeaterName, rowSettingsModel, index ) {
		let rowId = rowSettingsModel.get( '_id' );

		// TODO: Temp backwards compatibility. since 2.8.0.
		if ( ! rowId ) {
			rowId = 'bc-' + elementor.helpers.getUniqueID();
			rowSettingsModel.set( '_id', rowId );
		}

		this.children[ index ] = new elementorModules.editor.Container( {
			type: 'repeater',
			id: rowSettingsModel.get( '_id' ),
			model: new Backbone.Model( {
				name: repeaterName,
			} ),
			settings: rowSettingsModel,
			view: this.view,
			parent: this,
			label: this.label + ' ' + elementor.translate( 'Item' ),
			controls: rowSettingsModel.options.controls,
			renderer: this.renderer,
		} );
	}

	/**
	 * Function lookup().
	 *
	 * If the view were destroyed, try to find it again if it exists.
	 *
	 * TODO: Refactor.
	 *
	 * @returns {Container}
	 */
	lookup() {
		let result = this;

		if ( ! this.renderer ) {
			return this;
		}

		if ( this !== this.renderer && this.renderer.view.isDestroyed ) {
			this.renderer = this.renderer.lookup();
		}

		if ( undefined === this.view || ! this.view.lookup || ! this.view.isDestroyed ) {
			// Hack For repeater item the result is the parent container.
			if ( 'repeater' === this.type ) {
				this.settings = this.parent.settings.get( this.model.get( 'name' ) ).findWhere( { _id: this.id } );
			}
			return result;
		}

		const lookup = this.view.lookup();

		if ( lookup ) {
			result = lookup.getContainer();

			// Hack For repeater item the result is the parent container.
			if ( 'repeater' === this.type ) {
				this.settings = result.settings.get( this.model.get( 'name' ) ).findWhere( { _id: this.id } );
				return this;
			}
		}

		return result;
	}

	/**
	 * Function render().
	 *
	 * Call view render.
	 *
	 * Run's `this.renderer.view.renderOnChange( this.settings ) `.
	 * When `this.renderer` exist.
	 *
	 */
	render() {
		if ( ! this.renderer ) {
			return;
		}

		this.renderer.view.renderOnChange( this.settings );
	}

	isEditable() {
		return 'edit' === elementor.channels.dataEditMode.request( 'activeMode' ) && 'open' === this.document.editor.status;
	}

	isDesignable() {
		return elementor.userCan( 'design' ) && this.isEditable();
	}
}
