class_name ExplorationPlayer
extends CharacterBody2D

signal map_position_changed(value: Vector2)

@export var move_speed := 54.0
@export var movement_bounds := Rect2(15.0, 16.0, 370.0, 192.0)

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D

var movement_enabled := true
var facing := Vector2.DOWN


func _ready() -> void:
	z_index = 30
	var collision := CollisionShape2D.new()
	collision.name = "CollisionShape2D"
	var shape := CapsuleShape2D.new()
	shape.radius = 2.25
	shape.height = 7.5
	collision.shape = shape
	collision.position = Vector2(0.0, 1.5)
	add_child(collision)
	_update_sprite_animation(false)


func _physics_process(_delta: float) -> void:
	if not movement_enabled:
		velocity = Vector2.ZERO
		_update_sprite_animation(false)
		return

	var direction := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var keyboard_direction := Vector2(
		float(Input.is_key_pressed(KEY_D)) - float(Input.is_key_pressed(KEY_A)),
		float(Input.is_key_pressed(KEY_S)) - float(Input.is_key_pressed(KEY_W))
	)
	if keyboard_direction.length_squared() > 0.0:
		direction = keyboard_direction.normalized()

	if direction.length_squared() > 0.0:
		facing = direction.normalized()
		velocity = facing * move_speed
	else:
		velocity = Vector2.ZERO
	_update_sprite_animation(velocity.length_squared() > 0.0)

	var before := position
	move_and_slide()
	position.x = clampf(position.x, movement_bounds.position.x, movement_bounds.end.x)
	position.y = clampf(position.y, movement_bounds.position.y, movement_bounds.end.y)
	if not position.is_equal_approx(before):
		map_position_changed.emit(position)


func set_movement_enabled(value: bool) -> void:
	movement_enabled = value
	if not value:
		velocity = Vector2.ZERO
		_update_sprite_animation(false)


func set_map_position(value: Vector2) -> void:
	position = Vector2(
		clampf(value.x, movement_bounds.position.x, movement_bounds.end.x),
		clampf(value.y, movement_bounds.position.y, movement_bounds.end.y)
	)
	map_position_changed.emit(position)


func face_direction(direction: Vector2, moving := false) -> void:
	if direction.length_squared() > 0.0:
		facing = direction.normalized()
	_update_sprite_animation(moving)


func get_animation_snapshot() -> Dictionary:
	return {
		"animation": String(animated_sprite.animation),
		"frame": animated_sprite.frame,
		"playing": animated_sprite.is_playing(),
		"animationNames": animated_sprite.sprite_frames.get_animation_names(),
		"scale": [animated_sprite.scale.x, animated_sprite.scale.y]
	}


func _update_sprite_animation(moving: bool) -> void:
	var animation_name := StringName("walk_" + _facing_direction_name())
	if moving:
		if animated_sprite.animation != animation_name or not animated_sprite.is_playing():
			animated_sprite.play(animation_name)
	else:
		if animated_sprite.animation != animation_name:
			animated_sprite.animation = animation_name
		animated_sprite.stop()
		animated_sprite.frame = 0
		animated_sprite.frame_progress = 0.0


func _facing_direction_name() -> String:
	if absf(facing.x) > absf(facing.y):
		return "east" if facing.x >= 0.0 else "west"
	return "south" if facing.y >= 0.0 else "north"
