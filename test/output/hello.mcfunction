##### Generated with MinecraftScript (mcs) #####
execute @a ~ ~ ~  execute @p ~ ~ ~ scoreboard objectives add hey dummy
execute @a ~ ~ ~  execute @p ~ ~ ~ scoreboard players set hey 10
execute @a ~ ~ ~  execute @p ~ ~ ~ call function(hey)
execute @a ~ ~ ~  execute @p ~ ~ ~ call function(hey,hai)
call function(test)
