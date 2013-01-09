"use strict";
jQuery._createElement = function( tagName, props ) {
	return $( $.extend( document.createElement( tagName ), props ) );
};

jQuery.suitUp = {
	controls: [ 'italic', 'bold', '|', 'formatblock#<h1>', 'formatblock#<h2>', 'formatblock#<h3>', 'formatblock#<p>' , '|', 'fontname', 'link' ],
	
	commands: {
		bold: null,
		italic: null,
		createlink: function( callback ){
			callback( window.prompt( 'URL:', '' ) );
		},
		fontname: {
			Arial: 'arial',
			Times: 'times'
		}
	},
	
	custom: {
		link: function() {
			return jQuery._createElement( 'a', {
				className: 'suitup-control',
				href: '#'
			}).attr({
				'data-command': 'createlink' // adding same style as for createlink command button
			}).on( 'click', function() {
				if( !$.suitUp.hasSelectedNodeParent( 'a' ) ) {
					document.execCommand( 'createlink', false, window.prompt( 'URL:', '' ) );
				} else {
					document.execCommand( 'unlink', false, null );
				}
			});			
		}
	},
	
	getSelection: function() {
		var range;
		if( window.getSelection ) {
			try {
				range = window.getSelection().getRangeAt( 0 );
			} catch(e) {}
		} else if(document.selection) { 
			range = document.selection.createRange();  
		}
		return range;
	},
	
	restoreSelection: function( range ) {
		var s;
		if ( range ) {
			if ( window.getSelection ) {
				s = window.getSelection();
				if ( s.rangeCount > 0 ) 
					s.removeAllRanges();
				s.addRange( range );
			} else if (document.createRange) {
				window.getSelection().addRange( range );
			} else if ( document.selection ) {
				range.select();
			}
		}
	},
	
	getSelectedNode: function() {
		if ( document.selection ) {
			return document.selection.createRange().parentElement();
		} else {
			var selection = window.getSelection();
			if ( selection.rangeCount > 0 ) {
				return selection.getRangeAt( 0 ).endContainer;
			}
		}
	},
	
	hasSelectedNodeParent: function( tagName ) {
		var node = this.getSelectedNode(),
			has = false;
		tagName = tagName.toUpperCase();
		while( node && node.tagName !== 'BODY' ) {
			if( node.tagName === tagName ) {
				has = true;
				break;
			}
			node = node.parentNode;
		}
		return has;
	}
};

jQuery.fn.suitUp = function( controls ) {
	var $ = jQuery,
		suitUp = $.suitUp,
		lastSelectionRange,
		lastSelectionElement,
		commands = $.suitUp.commands,
		custom = $.suitUp.custom,
		doc = document,
		
		create = $._createElement,
		getSelection = suitUp.getSelection,
		restoreSelection = suitUp.restoreSelection;
	
	controls = controls || $.suitUp.controls;
	
	controls = controls instanceof Array ? controls : Array.prototype.slice.call( arguments ); // IE changes the arguments object when one of the arguments is redefined
	
	return this.each( function() {
		var that = this,
			self = $( this ).hide(),
			buttonControls,
			selectControls,
			typeofCommandValue,
			commandValue,
			select,
			
			mainBlock = create( 'div', {
				className: 'suitup'
			}).width( self.width() ),
			
			controlsBlock = create( 'div', {
				className: 'suitup-controls'
			}).appendTo( mainBlock ),
			
			containerBlock = create( 'div', {
				className: 'suitup-editor',
				contentEditable: true
			}).keyup( function(){ 
				updateTextarea();
				highlightActiveControls();
			}).focus( function(){
				lastSelectionElement = this;
				//document.execCommand('styleWithCSS', null, false);
			}).mouseup( function(){
				highlightActiveControls();
			})
			.html( that.value )
			.height( self.height() )
			.appendTo( mainBlock ),
			
			updateTextarea = function() {
				that.value = containerBlock.html();
			},
			
			setButtonCommandState = function( elem, command, value ){
				
			},
			
			highlightActiveControls = function() {
				buttonControls = buttonControls || $( 'a.suitup-control', controlsBlock );
				buttonControls
				 .removeClass( 'active' )
				 .each( function(){
					var self = $( this ),
						command = self.data( 'command' ),
						value = self.data( 'value' );
						
					try {
						value = value ? value.replace( '<', '' ).replace( '>', '' ) : value; // for formatBlock
						doc.queryCommandValue( command ) === ( value || 'true' ) && self.addClass( 'active' );
					} catch( e ) {}
					try {
						doc.queryCommandState( command ) && self.addClass( 'active' );
					} catch( e ) {}
				});
				
				selectControls = selectControls || $( 'select.suitup-control', controlsBlock );
				selectControls.each( function(){
					var self = $( this ),
						command = self.data( 'command' ),
						value = doc.queryCommandValue( command ),
						option = self.children( 'option' ).filter( function() {
							return value && this.value.toLowerCase() === value.toLowerCase();
						});
						
					if( option.length ) {
						this.value = option.val();
					}
				});
			}
			
		for( var splittedControl, i = 0, control = controls[ 0 ]; i < controls.length; control = controls[ ++i ] ) {
			splittedControl = control.split( '#' );
			control = splittedControl[ 0 ];
			commandValue = splittedControl[ 1 ];
			
			if( control === '|' ) {
				create( 'span', {
					className: 'suitup-separator'
				}).appendTo( controlsBlock );
				
			} else if( control in commands || splittedControl[ 1 ] ) {
				commandValue = commandValue || commands[ control ];
				typeofCommandValue = typeof commandValue;
				
				if( commandValue && typeofCommandValue === 'object' ) {
					select = create( 'select', {
						className: 'suitup-control'
					})
					.attr( 'data-command', control )
					.appendTo( controlsBlock )
					.on( 'change', { command: control }, function( event ) {
						var command = event.data.command;
						doc.execCommand( command, null, this.value );
						updateTextarea();
					});
					
					$.each( commandValue, function( displayName, commandValue ) {
						create( 'option', {
							value: commandValue
						}).html( displayName )
						.appendTo( select );
					});
				} else {
					create( 'a', {
						href: '#',
						className: 'suitup-control'
					})
					.attr({
						'data-command': control,
						'data-value': typeofCommandValue === 'function' ? '_DYNAMIC_' : commandValue
					})
					.appendTo( controlsBlock )
					.on( 'click', { command: control, value: commandValue, typeofValue: typeofCommandValue }, function( event ){
						var command = event.data.command,
							value = event.data.value,
							typeofValue = event.data.typeofValue,
							resultValue;
						
						if( lastSelectionElement !== containerBlock[ 0 ] || !lastSelectionRange ) {
							containerBlock.focus();
						}
						
						if( typeofValue === 'function' ) {
							lastSelectionRange = getSelection();
							value( function( resultValue ) {
								lastSelectionElement.focus();
								restoreSelection( lastSelectionRange );
								doc.execCommand( command, null, resultValue );
								updateTextarea();
							});
						} else {
							resultValue = value;
							doc.execCommand( command, null, resultValue );
							updateTextarea();
							highlightActiveControls();
						}
						
						return false;
					});
				}
				
			} else if( control in custom ) {
				custom[ control ]( that, mainBlock[ 0 ] ).appendTo( controlsBlock );
			}
		}
			
		mainBlock.insertBefore( that );
		
	});
};